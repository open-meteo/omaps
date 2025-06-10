import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import {
	OmFileReader,
	OmDataType,
	MemoryHttpBackend,
	type TypedArray
} from '@openmeteo/file-reader';

import QuickLRU from 'quick-lru';

import { getIndexFromLatLong, interpolate2DHermite } from './utils/math';

import { domains } from './utils/domains';
import { variables } from './utils/variables';

import TileWorker from './worker?worker';

import type { TileJSON, TileIndex, Domain, Variable } from './types';
import { DynamicProjection, ProjectionGrid, type Projection } from './utils/projection';

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

let domain: Domain;
let variable: Variable;

let projection: Projection;
let projectionGrid: ProjectionGrid;
let projectionName: string;

let nx: number;
let ny: number;
let lonMin: number;
let latMin: number;
let dx: number;
let dy: number;

interface FileReader {
	reader: OmFileReader | undefined;
	backend: MemoryHttpBackend | undefined;

	readeru: OmFileReader | undefined;
	readerv: OmFileReader | undefined;
	backendu: MemoryHttpBackend | undefined;
	backendv: MemoryHttpBackend | undefined;
}

const fileReader: FileReader = {
	reader: undefined,
	backend: undefined,

	readeru: undefined,
	readerv: undefined,
	backendu: undefined,
	backendv: undefined
};

interface Data {
	values: TypedArray;
	direction?: TypedArray;
}

let data: Data;

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	if (data) {
		const values = data.values;

		let indexObject;
		if (domain.grid.projection) {
			indexObject = projectionGrid.findPointInterpolated(lat, lon);
		} else {
			indexObject = getIndexFromLatLong(lat, lon, domain);
		}

		const { index, xFraction, yFraction } = indexObject ?? {
			index: 0,
			xFraction: 0,
			yFraction: 0
		};

		if (values && index) {
			//const px = interpolateLinear(data, index, xFraction, yFraction);
			const px = interpolate2DHermite(
				values,
				domain.grid.nx,
				index,
				xFraction,
				yFraction
			);
			if (variable.value === 'wind') {
				const direction = data.direction as TypedArray;
				const dir = interpolate2DHermite(
					direction,
					domain.grid.nx,
					index,
					xFraction,
					yFraction
				);
				return [px, dir];
			} else {
				return px;
			}
		} else {
			return NaN;
		}
	}
};

const getTile = async ({ z, x, y }: TileIndex, omUrl: string): Promise<ImageBitmap> => {
	const key = `${omUrl}/${TILE_SIZE}/${z}/${x}/${y}`;

	const worker = new TileWorker();

	worker.postMessage({ type: 'GT', x, y, z, key, data, domain, variable });
	const tilePromise = new Promise<ImageBitmap>((resolve) => {
		worker.onmessage = (message) => {
			if (message.data.type == 'RT' && key == message.data.key) {
				resolve(message.data.tile);
			}
		};
	});

	return tilePromise;
};

const renderTile = async (url: string) => {
	// Read URL parameters
	const re = new RegExp(/om:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
	const result = url.match(re);
	if (!result) {
		throw new Error(`Invalid OM protocol URL '${url}'`);
	}
	const urlParts = result[1].split('#');
	const omUrl = urlParts[0];

	const z = parseInt(result[2]);
	const x = parseInt(result[3]);
	const y = parseInt(result[4]);

	// Read OM data
	const tile = await getTile({ z, x, y }, omUrl);

	return tile;
};

const getBorderPoints = () => {
	const points = [];
	console.log(nx, ny, dx, dy, projectionGrid);
	for (let i = 0; i < projectionGrid.ny; i++) {
		points.push([
			projectionGrid.origin[0],
			projectionGrid.origin[1] + i * projectionGrid.dy
		]);
	}
	for (let i = 0; i < projectionGrid.nx; i++) {
		points.push([
			projectionGrid.origin[0] + i * projectionGrid.dx,
			projectionGrid.origin[1] + projectionGrid.ny * projectionGrid.dy
		]);
	}
	for (let i = projectionGrid.ny; i >= 0; i--) {
		points.push([
			projectionGrid.origin[0] + projectionGrid.nx * projectionGrid.dx,
			projectionGrid.origin[1] + i * projectionGrid.dy
		]);
	}
	for (let i = projectionGrid.nx; i >= 0; i--) {
		points.push([
			projectionGrid.origin[0] + i * projectionGrid.dx,
			projectionGrid.origin[1]
		]);
	}

	return points;
};

const getTilejson = async (fullUrl: string): Promise<TileJSON> => {
	let minLon;
	let minLat;
	let maxLon;
	let maxLat;

	let bounds;
	if (domain.grid.projection) {
		if (domain.grid.projection.bounds) {
			bounds = domain.grid.projection.bounds;
		} else {
			// loop over all border points to get max / min lat / lon
			const borderPoints = getBorderPoints();
			const origin = projectionGrid.origin;
			const originLatLon = projection.reverse(origin);
			minLon = lonMin;
			minLat = latMin;
			maxLon = lonMin;
			maxLat = latMin;
			for (let borderPoint of borderPoints) {
				const borderPointLatLon = projection.reverse(borderPoint);
				if (borderPointLatLon[0] < minLat) {
					minLat = borderPointLatLon[0];
				}
				if (borderPointLatLon[0] > maxLat) {
					maxLat = borderPointLatLon[0];
				}
				if (borderPointLatLon[1] < minLon) {
					minLon = borderPointLatLon[1];
				}
				if (borderPointLatLon[1] > maxLon) {
					maxLon = borderPointLatLon[1];
				}
			}
			bounds = [minLon, minLat, maxLon, maxLat];
		}
	} else {
		minLon = lonMin;
		minLat = latMin;
		maxLon = minLon + dx * nx;
		maxLat = minLat + dy * ny;
		bounds = [minLon, minLat, maxLon, maxLat];
	}

	return {
		tilejson: '2.2.0',
		tiles: [fullUrl + '/{z}/{x}/{y}'],
		attribution: 'open-meteo',
		minzoom: 1,
		maxzoom: 15,
		bounds: bounds
	};
};

const initOMFile = async (url: string) => {
	const omUrl = url.replace('om://', '');

	if (fileReader.reader) {
		fileReader.reader.dispose();
	}
	if (fileReader.readeru) {
		fileReader.readeru.dispose();
	}
	if (fileReader.readerv) {
		fileReader.readerv.dispose();
	}
	delete fileReader.reader;
	delete fileReader.backend;

	domain = domains.find((dm) => dm.value === omUrl.split('/')[4]) ?? domains[0];
	const variableString = omUrl.split('/')[omUrl.split('/').length - 1].replace('.om', '');
	variable = variables.find((v) => v.value === variableString) ?? variables[0];

	nx = domain.grid.nx;
	ny = domain.grid.ny;
	latMin = domain.grid.latMin;
	lonMin = domain.grid.lonMin;
	dx = domain.grid.dx;
	dy = domain.grid.dy;

	if (domain.grid.projection) {
		const latitude = domain.grid.projection.latitude ?? domain.grid.latMin;
		const longitude = domain.grid.projection.longitude ?? domain.grid.lonMin;

		projectionName = domain.grid.projection.name;
		projection = new DynamicProjection(
			projectionName,
			domain.grid.projection
		) as Projection;
		projectionGrid = new ProjectionGrid(
			projection,
			nx,
			ny,
			latitude,
			longitude,
			dx,
			dy
		);
	}

	if (variable.value === 'wind') {
		fileReader.backendu = new MemoryHttpBackend({
			url: omUrl.replace('wind.om', 'wind_u_component_10m.om'),
			maxFileSize: 500 * 1024 * 1024 // 500 MB
		});
		fileReader.backendv = new MemoryHttpBackend({
			url: omUrl.replace('wind.om', 'wind_v_component_10m.om'),
			maxFileSize: 500 * 1024 * 1024 // 500 MB
		});
		fileReader.readeru = await OmFileReader.create(fileReader.backendu).catch(() => {
			throw new Error(`OMFile error: 404 file not found`);
		});
		fileReader.readerv = await OmFileReader.create(fileReader.backendv).catch(() => {
			throw new Error(`OMFile error: 404 file not found`);
		});
		if (fileReader.readeru && fileReader.readerv) {
			const dimensions = fileReader.readeru.getDimensions();

			// Create ranges for each dimension
			const ranges = dimensions.map((dim, _) => {
				return { start: 0, end: dim };
			});
			const datau = await fileReader.readeru.read(OmDataType.FloatArray, ranges);
			const datav = await fileReader.readerv.read(OmDataType.FloatArray, ranges);

			const dataValues = [];
			const dataDirection: Float32Array<ArrayBuffer> = [];

			for (let [i, dp] of datau.entries()) {
				dataValues.push(
					Math.sqrt(Math.pow(dp, 2) + Math.pow(datav[i], 2)) * 1.94384
				);

				dataDirection.push(
					(Math.atan2(dp, datav[i]) * (180 / Math.PI) + 360) % 360
				);
			}
			data = { values: dataValues, direction: dataDirection };
		}
	} else {
		fileReader.backend = new MemoryHttpBackend({
			url: omUrl,
			maxFileSize: 500 * 1024 * 1024 // 500 MB
		});
		fileReader.reader = await OmFileReader.create(fileReader.backend).catch(() => {
			throw new Error(`OMFile error: 404 file not found`);
		});
		if (fileReader.reader) {
			const dimensions = fileReader.reader.getDimensions();

			// Create ranges for each dimension
			const ranges = dimensions.map((dim, _) => {
				return { start: 0, end: dim };
			});
			let dataValues = await fileReader.reader.read(
				OmDataType.FloatArray,
				ranges
			);

			if (variable.value == 'wind_gusts_10m') {
				dataValues = dataValues.map((val) => val * 1.94384);
			}

			data = { values: dataValues };
		}
	}
};

export const omProtocol = async (
	params: RequestParameters
): Promise<GetResourceResponse<TileJSON | ImageBitmap>> => {
	if (params.type == 'json') {
		// Parse OMfile here to cache data
		await initOMFile(params.url);
		return {
			data: await getTilejson(params.url)
		};
	} else if (params.type == 'image') {
		return {
			data: await renderTile(params.url)
		};
	} else {
		throw new Error(`Unsupported request type '${params.type}'`);
	}
};
