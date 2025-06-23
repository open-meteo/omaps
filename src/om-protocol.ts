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
} from './utils/math';

import { domains } from './utils/domains';
import { variables, requestMultiple } from './utils/variables';

import iconListPixelsSource from './utils/icons';
import arrowPixelsSource from './utils/arrow';

import TileWorker from './worker?worker';

import type { TileJSON, TileIndex, Domain, Variable, Bounds } from './types';
import { DynamicProjection, ProjectionGrid, type Projection } from './utils/projection';

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
	readerDirections: OmFileReader | undefined;

	backendu: MemoryHttpBackend | undefined;
	backendv: MemoryHttpBackend | undefined;
	backendDirections: MemoryHttpBackend | undefined;
}

const fileReader: FileReader = {
	reader: undefined,
	backend: undefined,

	readeru: undefined,
	readerv: undefined,
	readerDirections: undefined,

	backendu: undefined,
	backendv: undefined,
	backendDirections: undefined
};

interface Data {
	values: number[] | TypedArray;
	directions?: number[] | TypedArray;
}

let data: Data;

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE) * 2;

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
				values as TypedArray,
				domain.grid.nx,
				index,
				xFraction,
				yFraction
			);
			if (variable.value === 'wind') {
				const directions = data.directions as TypedArray;
				const dir = interpolate2DHermite(
					directions,
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

let iconPixelData = {};
let arrowPixelData = {};

const initPixelData = async () => {
	for (let [key, iconUrl] of Object.entries(arrowPixelsSource)) {
		const response = await fetch(iconUrl);
		const svgString = await response.text();

		const svg64 = btoa(svgString);
		const b64Start = 'data:image/svg+xml;base64,';

		const image64 = b64Start + svg64;
		const canvas = new OffscreenCanvas(32, 32);

		let img = new Image();
		img.onload = () => {
			canvas.getContext('2d').drawImage(img, 0, 0);
			const iconData = canvas.getContext('2d').getImageData(0, 0, 32, 32);

			arrowPixelData[key] = iconData.data;
		};
		img.src = image64;
	}

	for (let [key, iconUrl] of Object.entries(iconListPixelsSource)) {
		const response = await fetch(iconUrl);
		const svgString = await response.text();

		const svg64 = btoa(svgString);
		const b64Start = 'data:image/svg+xml;base64,';

		const image64 = b64Start + svg64;
		const canvas = new OffscreenCanvas(64, 64);

		let img = new Image();
		img.onload = () => {
			canvas.getContext('2d').drawImage(img, 0, 0);
			const iconData = canvas.getContext('2d').getImageData(0, 0, 64, 64);

			iconPixelData[key] = iconData.data;
		};
		img.src = image64;
	}
};

const getTile = async ({ z, x, y }: TileIndex, omUrl: string): Promise<ImageBitmap> => {
	const key = `${omUrl}/${TILE_SIZE}/${z}/${x}/${y}`;

	const worker = new TileWorker();

	let iconList = {};
	if (variable.value === 'weather_code') {
		iconList = iconPixelData;
	} else if (variable.value.startsWith('wind')) {
		iconList = arrowPixelData;
	}

	worker.postMessage({
		type: 'GT',
		x,
		y,
		z,
		key,
		data,
		domain,
		variable,
		iconPixelData: iconList
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
		attribution: 'open-meteo',
		minzoom: 1,
		maxzoom: 15,
		bounds: bounds
	};
};

const initOMFile = async (url: string) => {
	initPixelData();

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
	if (fileReader.readerDirections) {
		fileReader.readerDirections.dispose();
	}

	delete fileReader.reader;
	delete fileReader.readeru;
	delete fileReader.readerv;
	delete fileReader.readerDirections;

	delete fileReader.backend;
	delete fileReader.backendu;
	delete fileReader.backendv;
	delete fileReader.backendDirections;

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
		const projectOrigin = domain.grid.projection.projectOrigin ?? true;

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
			dy,
			projectOrigin
		);
	}

	if (requestMultiple.includes(variable.value)) {
		let reg = new RegExp(/wind_(\d+)m\.om/);
		const matches = url.match(reg);
		if (domain.windUVComponents) {
			fileReader.backendu = new MemoryHttpBackend({
				url: omUrl.replace(
					matches[0],
					`wind_u_component_${matches[1]}m.om`
				),
				maxFileSize: 500 * 1024 * 1024 // 500 MB
			});
			fileReader.backendv = new MemoryHttpBackend({
				url: omUrl.replace(
					matches[0],
					`wind_v_component_${matches[1]}m.om`
				),
				maxFileSize: 500 * 1024 * 1024 // 500 MB
			});
			fileReader.readeru = await OmFileReader.create(fileReader.backendu).catch(
				() => {
					throw new Error(`OMFile error: 404 file not found`);
				}
			);
			fileReader.readerv = await OmFileReader.create(fileReader.backendv).catch(
				() => {
					throw new Error(`OMFile error: 404 file not found`);
				}
			);
			if (fileReader.readeru && fileReader.readerv) {
				const dimensions = fileReader.readeru.getDimensions();

				// Create ranges for each dimension
				const ranges = dimensions.map((dim, _) => {
					return { start: 0, end: dim };
				});
				const datau = await fileReader.readeru.read(
					OmDataType.FloatArray,
					ranges
				);
				const datav = await fileReader.readerv.read(
					OmDataType.FloatArray,
					ranges
				);

				const dataValues = [];
				const dataDirections = [];

				for (let [i, dp] of datau.entries()) {
					dataValues.push(
						Math.sqrt(Math.pow(dp, 2) + Math.pow(datav[i], 2)) *
							1.94384
					);

					dataDirections.push(
						(Math.atan2(dp, datav[i]) * (180 / Math.PI) + 360) %
							360
					);
				}
				data = { values: dataValues, directions: dataDirections };
			}
		} else {
			fileReader.backend = new MemoryHttpBackend({
				url: omUrl.replace(matches[0], `wind_speed_${matches[1]}m.om`),
				maxFileSize: 500 * 1024 * 1024 // 500 MB
			});
			fileReader.backendDirections = new MemoryHttpBackend({
				url: omUrl.replace(matches[0], `wind_direction_${matches[1]}m.om`),
				maxFileSize: 500 * 1024 * 1024 // 500 MB
			});

			fileReader.reader = await OmFileReader.create(fileReader.backend).catch(
				() => {
					throw new Error(`OMFile error: 404 file not found`);
				}
			);
			fileReader.readerDirections = await OmFileReader.create(
				fileReader.backendDirections
			).catch(() => {
				throw new Error(`OMFile error: 404 file not found`);
			});

			if (fileReader.reader && fileReader.readerDirections) {
				const dimensions = fileReader.reader.getDimensions();

				// Create ranges for each dimension
				const ranges = dimensions.map((dim, _) => {
					return { start: 0, end: dim };
				});
				const dataWind = await fileReader.reader.read(
					OmDataType.FloatArray,
					ranges
				);
				const dataDirs = await fileReader.readerDirections.read(
					OmDataType.FloatArray,
					ranges
				);

				const dataValues = [];
				const dataDirections = [];

				for (let [i, dp] of dataWind.entries()) {
					dataValues.push(dp * 1.94384);
					dataDirections.push(360 - dataDirs[i]);
				}

				data = { values: dataValues, directions: dataDirections };
			}
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
