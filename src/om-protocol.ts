import { type GetResourceResponse, type RequestParameters } from 'maplibre-gl';

import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import QuickLRU from 'quick-lru';

import { colorScale } from './utils/color-scales';

import { tile2lat, tile2lon, getIndexFromLatLong, interpolate2DHermite } from './utils/math';

import { domains } from './utils/domains';

import TileWorker from './worker?worker';

import { type TileJSON, type TileIndex } from './types';

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

let domain;

let nx;
let ny;
let lonMin;
let latMin;
let dx;
let dy;

interface FileReader {
	reader: OmFileReader | undefined;
	backend: MemoryHttpBackend | undefined;
}

const fileReader: FileReader = {
	reader: undefined,
	backend: undefined
};

const tileCache = new QuickLRU<string, ImageBitmap>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const omFileDataCache = new QuickLRU<string, Float32Array<ArrayBufferLike>>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	const data = omFileDataCache.get(omUrl);
	const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon, domain);

	if (data && index) {
		//const px = interpolateLinear(data, index, xFraction, yFraction);
		const px = interpolate2DHermite(data, nx, index, xFraction, yFraction);
		return px;
	} else {
		return NaN;
	}
};

const getTile = async ({ z, x, y }: TileIndex, omUrl: string): Promise<ImageBitmap> => {
	const key = `${omUrl}/${TILE_SIZE}/${z}/${x}/${y}`;
	const cachedTile = tileCache.get(key);
	if (cachedTile) {
		return cachedTile;
	} else {
		const worker = new TileWorker();

		const data = omFileDataCache.get(omUrl)!;
		worker.postMessage({ type: 'GT', x, y, z, key, data, domain });
		const tilePromise = new Promise<ImageBitmap>((resolve) => {
			worker.onmessage = (message) => {
				if (message.data.type == 'RT' && key == message.data.key) {
					tileCache.set(key, message.data.tile);
					resolve(message.data.tile);
				}
			};
		});

		return tilePromise;
	}
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

		if (fileReader.reader) {
			fileReader.reader.dispose();
		}
		delete fileReader.reader;
		delete fileReader.backend;

		domain = domains.find((dm) => dm.value === omUrl.split('/')[4]) ?? domains[0];

		nx = domain.grid.nx;
		ny = domain.grid.ny;
		lonMin = domain.grid.lonMin;
		latMin = domain.grid.latMin;
		dx = domain.grid.dx;
		dy = domain.grid.dy;

		fileReader.backend = new MemoryHttpBackend({
			url: omUrl,
			maxFileSize: 500 * 1024 * 1024 // 500 MB
		});
		fileReader.reader = await OmFileReader.create(fileReader.backend);
		if (fileReader.reader) {
			const dimensions = fileReader.reader.getDimensions();

			// Create ranges for each dimension
			const ranges = dimensions.map((dim, _) => {
				return { start: 0, end: dim };
			});
			const data = await fileReader.reader.read(OmDataType.FloatArray, ranges);
			omFileDataCache.set(omUrl, data);

			// worker.postMessage({ type: 'SD', omData: data });
		}

		const tileJson = await getTilejson(params.url);

		return {
			data: tileJson
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
