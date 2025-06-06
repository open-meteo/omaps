import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import QuickLRU from 'quick-lru';

import { colorScale } from './utils/color-scales';

import { tile2lat, tile2lon, getIndexFromLatLong, interpolate2DHermite } from './utils/math';

import { domains } from './utils/domains';

import { type TileJSON, type TileIndex } from './types';

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

const omFileDataCache = new QuickLRU<string, Float32Array<ArrayBufferLike>>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);
const OPACITY = Number(import.meta.env.VITE_TILE_OPACITY);

const nx = domain.grid.nx;
const ny = domain.grid.ny;
const lonMin = domain.grid.lonMin;
const latMin = domain.grid.latMin;
const dx = domain.grid.dx;
const dy = domain.grid.dy;

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	const data = omFileDataCache.get(omUrl);
	const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon);

	if (data && index) {
		//const px = interpolateLinear(data, index, xFraction, yFraction);
		const px = interpolate2DHermite(data, nx, index, xFraction, yFraction);
		return px;
	} else {
		return NaN;
	}
};

const colors = colorScale({
	min: 0,
	max: 30
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
	const start = performance.now();

	const data = omFileDataCache.get(omUrl)!;
	const pixels = TILE_SIZE * TILE_SIZE;
	const rgba = new Uint8ClampedArray(pixels * 4);

	for (let i = 0; i < TILE_SIZE; i++) {
		const lat = tile2lat(y + i / TILE_SIZE, z);
		for (let j = 0; j < TILE_SIZE; j++) {
			const ind = j + i * TILE_SIZE;
			const lon = tile2lon(x + j / TILE_SIZE, z);

			const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon);
			//const px = interpolateLinear(data, index, xFraction, yFraction);
			const px = interpolate2DHermite(data, nx, index, xFraction, yFraction);
			//const px = quinticHermite2D(data, nx, index, xFraction, yFraction);

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

	console.log(
		`getTile(${x}/${y}/${z}): elapsed time: ${(performance.now() - start).toFixed(3)} ms`
	);

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
		bounds: [lonMin, latMin, lonMin + dx * nx, latMin + dy * ny]
	};
};

const omProtocol = async (params: RequestParameters): Promise<GetResourceResponse<ImageBitmap>> => {
	if (params.type == 'json') {
		// Parse OMfile here to cache data
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
