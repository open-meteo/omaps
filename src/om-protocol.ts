import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import QuickLRU from 'quick-lru';

import { colorScale } from './utils/color-scales';

import { TILE_SIZE } from './constants';
import { tileIndexToMercatorBbox, mercatorBboxToGeographicBbox } from './utils/math';

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

const tileCache = new QuickLRU<string, Promise<TypedArray>>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const omFileDataCache = new QuickLRU<string, Float32Array>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const getRawTile = async (
	{ z, x, y }: TileIndex,
	url: string,
	tileSize: number = 256
): Promise<TypedArray> => {
	const key = `${url}/${tileSize}/${z}/${x}/${y}`;
	const cachedTile = tileCache.get(key);
	if (cachedTile) {
		return cachedTile;
	} else {
		tileCache.set(key, tile);
		return tile;
	}
};

const getDataCoordinates = async ({ z, x, y }: TileIndex, data: string): Promise<TypedArray> => {
	const mercBbox = tileIndexToMercatorBbox({ x, y, z });
	const bbox = mercatorBboxToGeographicBbox(mercBbox);

	console.log(bbox);
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

	urlParts.shift();

	const hash = urlParts.join('#') ?? '';
	const z = parseInt(result[2]);
	const x = parseInt(result[3]);
	const y = parseInt(result[4]);

	// Read OM data
	// Create a reader with a file backend

	const data = omFileDataCache.get(omUrl);
	if (!data) {
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
			const newData = await reader.read(OmDataType.FloatArray, ranges);
			omFileDataCache.set(omUrl, newData);
		}
	} else {
		const coordinates = getDataCoordinates({ z, x, y }, data);
	}

	// const renderCustom = CustomRendererStore.get(cogUrl);
	// if (renderCustom !== undefined) {
	// 	rgba = renderCustom(rawTile, metadata);
	// } else if (hash.startsWith('dem')) {
	// 	rgba = renderTerrain(rawTile, metadata);
	// } else if (hash.startsWith('color')) {
	// 	const colorParams = hash.split('color').pop()?.substring(1);

	// 	if (!colorParams) {
	// 		throw new Error('Color params are not defined');
	// 	} else {
	// 		const customColorsString = colorParams.match(
	// 			/\[("#([0-9a-fA-F]{3,6})"(,(\s)?)?)+]/
	// 		)?.[0];

	// 		let colorScheme: string = '';
	// 		let customColors: Array<HEXColor> = [];
	// 		let minStr: string;
	// 		let maxStr: string;
	// 		let modifiers: string;

	// 		if (customColorsString) {
	// 			customColors = JSON.parse(customColorsString);

	// 			[minStr, maxStr, modifiers] = colorParams
	// 				.replace(`${customColorsString},`, '')
	// 				.split(',');
	// 		} else {
	// 			[colorScheme, minStr, maxStr, modifiers] = colorParams.split(',');
	// 		}

	// 		const min = parseFloat(minStr),
	// 			max = parseFloat(maxStr),
	// 			isReverse = modifiers?.includes('-') || false,
	// 			isContinuous = modifiers?.includes('c') || false;

	// 		rgba = renderColor(rawTile, {
	// 			...metadata,
	// 			colorScale: {
	// 				colorScheme,
	// 				customColors,
	// 				min,
	// 				max,
	// 				isReverse,
	// 				isContinuous
	// 			}
	// 		});
	// 	}
	// } else {
	// 	rgba = renderPhoto(rawTile, metadata);
	// }
	const pixels = TILE_SIZE * TILE_SIZE;
	const rgba = new Uint8ClampedArray(pixels * 4);

	const interpolate = colorScale({
		min: 5,
		max: 30
	});

	for (let i = 0; i < pixels; i++) {
		const px = Math.random() * 25 + 5;
		if (isNaN(px) || px === Infinity) {
			rgba[4 * i] = 0;
			rgba[4 * i + 1] = 0;
			rgba[4 * i + 2] = 0;
			rgba[4 * i + 3] = 0;
		} else {
			const color = interpolate(px);
			rgba[4 * i] = color[0];
			rgba[4 * i + 1] = color[1];
			rgba[4 * i + 2] = color[2];
			rgba[4 * i + 3] = 100;
		}
	}

	return await createImageBitmap(new ImageData(rgba, TILE_SIZE, TILE_SIZE));
};

let domain = {
	value: 'dwd_icon_d2',
	label: ' DWD ICON D2',
	grid: { nx: 1214, ny: 745, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, zoom: 3.75 }
};

const getTilejson = async (fullUrl: string): Promise<TileJSON> => {
	return {
		tilejson: '2.2.0',
		tiles: [fullUrl + '/{z}/{x}/{y}'],
		attribution: 'open-meteo',
		minzoom: 2,
		maxzoom: 9,
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
