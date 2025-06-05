import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import QuickLRU from 'quick-lru';

import { colorScale } from './utils/color-scales';

import { type TileJSON, type TileIndex } from './types';

export const OPACITY = 75;
export const TILE_SIZE = 256;
const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

// const tileCache = new QuickLRU<string, ImageBitmap>({
// 	maxSize: 1024,
// 	maxAge: ONE_HOUR_IN_MILLISECONDS
// });

const omFileDataCache = new QuickLRU<string, Float32Array<ArrayBufferLike>>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

let domain = {
	value: 'dwd_icon_d2',
	label: ' DWD ICON D2',
	grid: { nx: 1215, ny: 746, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, zoom: 3.75 }
};

const nx = domain.grid.nx;
const ny = domain.grid.ny;
const lonMin = domain.grid.lonMin;
const latMin = domain.grid.latMin;
const dx = domain.grid.dx;
const dy = domain.grid.dy;

const r2d = 180 / Math.PI;
function tile2lon(x: number, z: number): number {
	return (x / Math.pow(2, z)) * 360 - 180;
}
function tile2lat(y: number, z: number): number {
	const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
	return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
export function tileToBBOX(tile: [x: number, y: number, z: number]) {
	const e = tile2lon(tile[0] + 1, tile[2]);
	const w = tile2lon(tile[0], tile[2]);
	const s = tile2lat(tile[1] + 1, tile[2]);
	const n = tile2lat(tile[1], tile[2]);
	return [w, s, e, n];
}

export const getIndexFromLatLong = (lat: number, lon: number) => {
	if (lat < latMin || lat > latMin + dy * ny || lon < lonMin || lon > lonMin + dx * nx) {
		return { index: NaN, xFraction: 0, yFraction: 0 };
	} else {
		const x = (lon - lonMin) / dx;
		const y = (lat - latMin) / dy;

		const xFraction = x - Math.floor(x);
		const yFraction = y - Math.floor(y);

		const index = Math.floor(y) * domain.grid.nx + Math.floor(x);
		return { index, xFraction, yFraction };
	}
};

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	const data = omFileDataCache.get(omUrl);
	const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon);

	if (data && index) {
		const p0 = data[index];
		const p1 = data[index + 1];
		const p2 = data[index + nx];
		const p3 = data[index + 1 + nx];

		return (
			p0 * (1 - xFraction) * (1 - yFraction) +
			p1 * xFraction * (1 - yFraction) +
			p2 * (1 - xFraction) * yFraction +
			p3 * xFraction * yFraction
		);
	} else {
		return NaN;
	}
};

const colors = colorScale({
	min: 0,
	max: 41
});

const getTile = async (
	{ z, x, y }: TileIndex,
	omUrl: string
	//tileSize: number = TILE_SIZE
): Promise<ImageBitmap> => {
	// const key = `${omUrl}/${tileSize}/${z}/${x}/${y}`;
	// const cachedTile = tileCache.get(key);
	// if (cachedTile) {
	// 	return cachedTile;
	// } else {
	const data = omFileDataCache.get(omUrl);
	const pixels = TILE_SIZE * TILE_SIZE;
	const rgba = new Uint8ClampedArray(pixels * 4);

	for (let i = 0; i < TILE_SIZE; i++) {
		const lat = tile2lat(y + i / TILE_SIZE, z);
		for (let j = 0; j < TILE_SIZE; j++) {
			const ind = j + i * TILE_SIZE;
			const lon = tile2lon(x + j / TILE_SIZE, z);

			const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon);
			const p0 = data[index];
			const p1 = data[index + 1];
			const p2 = data[index + nx];
			const p3 = data[index + 1 + nx];

			const px =
				p0 * (1 - xFraction) * (1 - yFraction) +
				p1 * xFraction * (1 - yFraction) +
				p2 * (1 - xFraction) * yFraction +
				p3 * xFraction * yFraction;

			if (isNaN(px) || px === Infinity) {
				rgba[4 * ind] = 0;
				rgba[4 * ind + 1] = 0;
				rgba[4 * ind + 2] = 0;
				rgba[4 * ind + 3] = 0;
			} else {
				const color =
					colors[
						Math.min(
							colors.length - 1,
							Math.max(0, Math.floor(px))
						)
					];
				if (color) {
					rgba[4 * ind] = color[0];
					rgba[4 * ind + 1] = color[1];
					rgba[4 * ind + 2] = color[2];
					rgba[4 * ind + 3] = 255 * (OPACITY / 100);
				}
			}
		}
	}

	const tile = await createImageBitmap(new ImageData(rgba, TILE_SIZE, TILE_SIZE));

	//tileCache.set(key, tile);
	return tile;
	//}
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
	return {
		tilejson: '2.2.0',
		tiles: [fullUrl + '/{z}/{x}/{y}'],
		attribution: 'open-meteo',
		minzoom: 1,
		maxzoom: 15,
		bounds: [
			domain.grid.lonMin,
			domain.grid.lonMin + domain.grid.dx * domain.grid.nx,
			domain.grid.latMin,
			domain.grid.latMin + domain.grid.dy * domain.grid.ny
		]
	};
};

const omProtocol = async (params: RequestParameters): Promise<GetResourceResponse<ImageBitmap>> => {
	if (params.type == 'json') {
		const omUrl = params.url.replace('om://', '');
		let backend = new MemoryHttpBackend({
			url: omUrl,
			maxFileSize: 500 * 1024 * 1024 // 500 MB
		});
		let reader = await OmFileReader.create(backend);
		if (reader) {
			const dimensions = reader.getDimensions();

			// Create ranges for each dimension
			const ranges = dimensions.map((dim, _) => {
				return { start: 0, end: dim };
			});
			const data = await reader.read(OmDataType.FloatArray, ranges);
			omFileDataCache.set(omUrl, data);
		}

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

export default omProtocol;
