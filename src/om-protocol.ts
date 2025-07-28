import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import {
	OmFileReader,
	OmDataType,
	MemoryHttpBackend,
	type TypedArray
} from '@openmeteo/file-reader';

import {
	interpolate2DHermite,
	getBorderPoints,
	getBoundsFromGrid,
	getIndexFromLatLong,
	getBoundsFromBorderPoints
} from '$lib/utils/math';

import { domains } from '$lib/utils/domains';
import { variables } from '$lib//utils/variables';

import TileWorker from './worker?worker';

import type { TileJSON, TileIndex, Domain, Variable, Bounds } from './types';
import { DynamicProjection, ProjectionGrid, type Projection } from '$lib/utils/projection';

let dark = false;
let domain: Domain;
let variable: Variable;
let currentPath: string;

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
	child?: OmFileReader | null;
}

const fileReader: FileReader = {
	reader: undefined,
	backend: undefined,
	child: undefined
};

interface Data {
	values: TypedArray | undefined;
	//directions?: TypedArray | undefined;
}

let data: Data;

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE) * 2;

export const getValueFromLatLong = (
	lat: number,
	lon: number
): { index: number; value: number; direction?: number } => {
	if (data) {
		const values = data.values;

		let indexObject;
		if (domain.grid.projection) {
			indexObject = projectionGrid.findPointInterpolated(lat, lon);
		} else {
			indexObject = getIndexFromLatLong(lat, lon, domain);
		}

		const { index, xFraction, yFraction } = indexObject ?? {
			index: NaN,
			xFraction: 0,
			yFraction: 0
		};

		if (values && index) {
			//const px = interpolateLinear(data, index, xFraction, yFraction);
			const px = interpolate2DHermite(
				values as TypedArray,
				domain.grid.nx,
				index,
				xFraction,
				yFraction
			);

			return { index: index, value: px };
		} else {
			return { index: NaN, value: NaN };
		}
	} else {
		return { index: NaN, value: NaN };
	}
};

const getTile = async ({ z, x, y }: TileIndex, omUrl: string): Promise<ImageBitmap> => {
	const key = `${omUrl}/${TILE_SIZE}/${z}/${x}/${y}`;

	const worker = new TileWorker();

	worker.postMessage({
		type: 'GT',
		x,
		y,
		z,
		key,
		data,
		domain,
		variable,
		dark: dark
	});
	const tilePromise = new Promise<ImageBitmap>((resolve) => {
		worker.onmessage = async (message) => {
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

const getTilejson = async (fullUrl: string): Promise<TileJSON> => {
	let bounds: Bounds;
	if (domain.grid.projection) {
		const borderPoints = getBorderPoints(projectionGrid);
		bounds = getBoundsFromBorderPoints(borderPoints, projection);
	} else {
		bounds = getBoundsFromGrid(lonMin, latMin, dx, dy, nx, ny);
	}

	return {
		tilejson: '2.2.0',
		tiles: [fullUrl + '/{z}/{x}/{y}'],
		attribution: '<a href="https://open-meteo.com">Open-Meteo</a>',
		minzoom: 1,
		maxzoom: 15,
		bounds: bounds
	};
};

const initOMFile = async (url: string) => {
	const [omUrl, omParams] = url.replace('om://', '').split('?');

	const urlParams = new URLSearchParams(omParams);
	dark = urlParams.get('dark') === 'true';
	domain = domains.find((dm) => dm.value === omUrl.split('/')[4]) ?? domains[0];
	variable = variables.find((v) => urlParams.get('variable') === v.value) ?? variables[0];

	console.log(currentPath, omUrl, omUrl !== currentPath);

	if (omUrl !== currentPath) {
		if (fileReader.child) {
			fileReader.child.dispose();
		}
		if (fileReader.reader) {
			fileReader.reader.dispose();
		}
		if (fileReader.backend) {
			fileReader.backend.close();
		}

		delete fileReader.child;
		delete fileReader.reader;
		delete fileReader.backend;

		nx = domain.grid.nx;
		ny = domain.grid.ny;
		latMin = domain.grid.latMin;
		lonMin = domain.grid.lonMin;
		dx = domain.grid.dx;
		dy = domain.grid.dy;

		if (domain.grid.projection) {
			const latitude = domain.grid.projection.latitude ?? domain.grid.latMin;
			const longitude = domain.grid.projection.longitude ?? domain.grid.lonMin;
			const projectOrigin = domain.grid.projection.projectOrigin ?? true;

			projectionName = domain.grid.projection.name;
			projection = new DynamicProjection(projectionName, domain.grid.projection) as Projection;
			projectionGrid = new ProjectionGrid(
				projection,
				nx,
				ny,
				latitude,
				longitude,
				dx,
				dy,
				projectOrigin
			);
		}

		fileReader.backend = new MemoryHttpBackend({
			url: omUrl,
			maxFileSize: 1000 * 1024 * 1024 // 500 MB,
		});
		fileReader.reader = await OmFileReader.create(fileReader.backend).catch(() => {
			throw new Error(`OMFile error: 404 file not found`);
		});

		for (const i of [...Array(fileReader.reader.numberOfChildren())].map((_, i) => i)) {
			const child = await fileReader.reader.getChild(i);
			if (child.getName() === variable.value) {
				const dimensions = child.getDimensions();

				// Create ranges for each dimension
				const ranges = dimensions.map((dim, _) => {
					return { start: 0, end: dim };
				});
				let dataValues;
				try {
					dataValues = await child.read(OmDataType.FloatArray, ranges);
				} catch (e) {
					if (e.message === 'memory access out of bounds') {
						console.log('memory access out of bounds');
						throw new Error('Out of memory');
					}
				}

				fileReader.child = child;
				data = { values: dataValues };
				break;
			} else {
				child.dispose();
			}
		}

		currentPath = omUrl;
	} else {
		if (fileReader.child) {
			fileReader.child.dispose();
		}
		delete fileReader.child;

		for (const i of [...Array(fileReader.reader.numberOfChildren())].map((_, i) => i)) {
			const child = await fileReader.reader.getChild(i);
			if (child.getName() === variable.value) {
				const dimensions = child.getDimensions();

				// Create ranges for each dimension
				const ranges = dimensions.map((dim, _) => {
					return { start: 0, end: dim };
				});
				let dataValues = await child.read(OmDataType.FloatArray, ranges);

				if (variable.value == 'wind_gusts_10m') {
					dataValues = dataValues.map((val) => val * 1.94384);
				}

				fileReader.child = child;
				data = { values: dataValues };
				break;
			} else {
				child.dispose();
			}
		}
	}
};

export const omProtocol = async (
	params: RequestParameters
): Promise<GetResourceResponse<TileJSON | ImageBitmap>> => {
	if (params.type == 'json') {
		// Parse OMfile here to intermediately save data
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
