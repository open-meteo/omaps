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
import { DynamicProjection, Projection, ProjectionGrid } from './utils/projection';

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

let λ0: number;
let ϕ0: number;
let ϕ1: number;
let ϕ2: number;
let radius: number;

interface FileReader {
	reader: OmFileReader | undefined;
	backend: MemoryHttpBackend | undefined;
}

const fileReader: FileReader = {
	reader: undefined,
	backend: undefined
};

const omFileDataCache = new QuickLRU<string, TypedArray>({
	maxSize: 1024,
	maxAge: ONE_HOUR_IN_MILLISECONDS
});

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	const data = omFileDataCache.get(omUrl);

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

	if (data && index) {
		//const px = interpolateLinear(data, index, xFraction, yFraction);
		const px = interpolate2DHermite(data, domain.grid.nx, index, xFraction, yFraction);
		return px;
	} else {
		return NaN;
	}
};

const getTile = async ({ z, x, y }: TileIndex, omUrl: string): Promise<ImageBitmap> => {
	const key = `${omUrl}/${TILE_SIZE}/${z}/${x}/${y}`;

	const worker = new TileWorker();

	const data = omFileDataCache.get(omUrl);
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

const getTilejson = async (fullUrl: string): Promise<TileJSON> => {
	console.log([lonMin, latMin]);
	console.log();

	console.log(projection.reverse(0, dy * ny));
	console.log(projection.reverse(dx * nx, 0));
	console.log(projection.reverse(dx * nx, dy * ny));
	console.log(projection.reverse(dy * ny, dx * nx));

	return {
		tilejson: '2.2.0',
		tiles: [fullUrl + '/{z}/{x}/{y}'],
		attribution: 'open-meteo',
		minzoom: 1,
		maxzoom: 15,
		bounds: domain.grid.projection
			? [
					// Math.min(
					// 	lonMin,
					// 	lonMin + projection.reverse(0, dy * ny)[0]
					// ),
					// Math.min(
					// 	latMin,
					// 	latMin + projection.reverse(dx * nx, 0)[1]
					// ),
					lonMin,
					latMin,
					lonMin + projection.reverse(dx * nx, dy * ny)[1],
					latMin + projection.reverse(dx * nx, dy * ny)[0]
				]
			: [lonMin, latMin, lonMin + dx * nx, latMin + dy * ny]
	};
};

export const omProtocol = async (
	params: RequestParameters
): Promise<GetResourceResponse<TileJSON | ImageBitmap>> => {
	if (params.type == 'json') {
		// Parse OMfile here to cache data
		const omUrl = params.url.replace('om://', '');

		omFileDataCache.clear();
		if (fileReader.reader) {
			fileReader.reader.dispose();
		}
		delete fileReader.reader;
		delete fileReader.backend;

		domain = domains.find((dm) => dm.value === omUrl.split('/')[4]) ?? domains[0];
		const variableString = omUrl
			.split('/')
			[omUrl.split('/').length - 1].replace('.om', '');
		variable = variables.find((v) => v.value === variableString) ?? variables[0];

		nx = domain.grid.nx;
		ny = domain.grid.ny;
		lonMin = domain.grid.lonMin;
		latMin = domain.grid.latMin;
		dx = domain.grid.dx;
		dy = domain.grid.dy;

		if (domain.grid.projection) {
			λ0 = domain.grid.projection.λ0;
			ϕ0 = domain.grid.projection.ϕ0;
			ϕ1 = domain.grid.projection.ϕ1;
			ϕ2 = domain.grid.projection.ϕ2;
			radius = domain.grid.projection.radius;
			projectionName = domain.grid.projection.name;
			projection = new DynamicProjection(projectionName, [
				λ0,
				ϕ0,
				ϕ1,
				ϕ2,
				radius
			]) as Projection;
			projectionGrid = new ProjectionGrid(
				projection,
				nx,
				ny,
				latMin,
				lonMin,
				dx,
				dy
			);
		}

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
			const data = await fileReader.reader.read(OmDataType.FloatArray, ranges);
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
