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

// DWD ICON World
//export const domain = {
//	value: 'dwd_icon',
//	label: 'DWD ICON',
//	grid: { nx: 2879, ny: 1441, latMin: -90, lonMin: -180, dx: 0.125, dy: 0.125, zoom: 1 }
//};

// DWD ICON EU
// export const domain = {
// 	value: 'dwd_icon_eu',
// 	label: 'DWD ICON EU',
// 	grid: { nx: 1377, ny: 657, latMin: 29.5, lonMin: -23.5, dx: 0.0625, dy: 0.0625, zoom: 2.2 }
// };

// DWD ICON D2
export const domain = {
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

const interpolateLinear = (data: Float32Array<ArrayBufferLike>, index: number, xFraction: number, yFraction: number): number => {
	const p0 = data[index];
	const p1 = data[index + 1];
	const p2 = data[index + nx];
	const p3 = data[index + 1 + nx];
	return p0 * (1 - xFraction) * (1 - yFraction) +
		p1 * xFraction * (1 - yFraction) +
		p2 * (1 - xFraction) * yFraction +
		p3 * xFraction * yFraction;
}


function hermite(t: number, p0: number, p1: number, m0: number, m1: number) {
	const t2 = t * t;
	const t3 = t2 * t;

	const h00 = 2 * t3 - 3 * t2 + 1;
	const h10 = t3 - 2 * t2 + t;
	const h01 = -2 * t3 + 3 * t2;
	const h11 = t3 - t2;

	return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

function getDerivative(fPrev: number, fNext: number) {
	return (fNext - fPrev) / 2;
}

function interpolate2DHermite(data: Float32Array<ArrayBufferLike>, nx: number, index: number, xFraction: number, yFraction: number) {
	let x = index % nx;
	let y = index / nx
	let ny = data.length / nx
	if (x <= 1 || y<=1 || x >= nx -3 || y >= ny -3) {
		return interpolateLinear(data, index, xFraction, yFraction);
	}

	// Interpolate along X for each of the 4 rows
	const interpRow = [];
	for (let j = -1; j < 3; j++) {
		const p0 = data[index + j * nx];
		const p1 = data[index + j * nx + 1];
		const m0 = getDerivative(data[index + j * nx - 1], data[index + j * nx + 1]);
		const m1 = getDerivative(data[index + j * nx + 0], data[index + j * nx + 2]);
		interpRow[j+1] = hermite(xFraction, p0, p1, m0, m1);
	}

	// Interpolate the result along Y
	const p0 = interpRow[1];
	const p1 = interpRow[2];
	const m0 = getDerivative(interpRow[0], interpRow[2]);
	const m1 = getDerivative(interpRow[1], interpRow[3]);
	return hermite(yFraction, p0, p1, m0, m1);
}

// 1D Quintic Hermite interpolation
function quinticHermite(t: number, f0: number, f1: number, m0: number, m1: number, c0: number, c1: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const h0 = 1 - 10 * t3 + 15 * t4 - 6 * t5;
  const h1 = t - 6 * t3 + 8 * t4 - 3 * t5;
  const h2 = 0.5 * t2 - 1.5 * t3 + 1.5 * t4 - 0.5 * t5;
  const h3 = 10 * t3 - 15 * t4 + 6 * t5;
  const h4 = -4 * t3 + 7 * t4 - 3 * t5;
  const h5 = 0.5 * t3 - t4 + 0.5 * t5;

  return (
    h0 * f0 + h1 * m0 + h2 * c0 +
    h3 * f1 + h4 * m1 + h5 * c1
  );
}

// Estimate first derivative (symmetric central)
function derivative(fm1: number, fp1: number): number {
  return (fp1 - fm1) / 2;
}

// Estimate second derivative (Laplacian-like)
function secondDerivative(fm1: number, f0: number, fp1: number): number {
  return fm1 - 2 * f0 + fp1;
}

// 2D Quintic Hermite Interpolation on a 6x6 or larger grid
function quinticHermite2D(data: Float32Array<ArrayBufferLike>, nx: number, index: number, xFraction: number, yFraction: number): number {
  // Collect interpolated values from 6 rows
  const colValues = [];

  for (let j = -2; j <= 3; j++) {
    const f0 = data[index + j * nx];
    const f1 = data[index + j * nx + 1];
    const m0 = derivative(data[index + j * nx - 1], data[index + j * nx + 1]);
    const m1 = derivative(data[index + j * nx], data[index + j * nx + 2]);
    const c0 = secondDerivative(data[index + j * nx - 1], f0, f1);
    const c1 = secondDerivative(f0, f1, data[index + j * nx + 2]);

    const interpolatedX = quinticHermite(xFraction, f0, f1, m0, m1, c0, c1);
    colValues.push(interpolatedX);
  }

  // Now interpolate in Y
  const f0 = colValues[2];
  const f1 = colValues[3];
  const m0 = derivative(colValues[1], colValues[3]);
  const m1 = derivative(colValues[2], colValues[4]);
  const c0 = secondDerivative(colValues[0], f0, f1);
  const c1 = secondDerivative(f0, f1, colValues[5]);

  return quinticHermite(yFraction, f0, f1, m0, m1, c0, c1);
}

export const getValueFromLatLong = (lat: number, lon: number, omUrl: string) => {
	const data = omFileDataCache.get(omUrl);
	const { index, xFraction, yFraction } = getIndexFromLatLong(lat, lon);

	if (data && index) {
		//const px = interpolateLinear(data, index, xFraction, yFraction);
		const px = interpolate2DHermite(data, nx, index, xFraction, yFraction);
		return px
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

		const tileJson = await getTilejson(params.url);

		console.log(tileJson);

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
