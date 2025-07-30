import type { TypedArray } from '@openmeteo/file-reader';
import type { Domain, Bounds, Center, IndexAndFractions } from '../../types';
import type { Range } from '../../types';
import { DynamicProjection, ProjectionGrid, type Projection } from './projection';

const r2d = 180 / Math.PI;
export const tile2lon = (x: number, z: number): number => {
	return (x / Math.pow(2, z)) * 360 - 180;
};
export const tile2lat = (y: number, z: number): number => {
	const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
	return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};
export const tileToBBOX = (tile: [x: number, y: number, z: number]) => {
	const e = tile2lon(tile[0] + 1, tile[2]);
	const w = tile2lon(tile[0], tile[2]);
	const s = tile2lat(tile[1] + 1, tile[2]);
	const n = tile2lat(tile[1], tile[2]);
	return [w, s, e, n];
};

export const interpolateLinear = (
	values: TypedArray,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number
): number => {
	const p0 = values[index];
	const p1 = values[index + 1];
	const p2 = values[index + nx];
	const p3 = values[index + 1 + nx];
	return (
		p0 * (1 - xFraction) * (1 - yFraction) +
		p1 * xFraction * (1 - yFraction) +
		p2 * (1 - xFraction) * yFraction +
		p3 * xFraction * yFraction
	);
};

export const hermite = (t: number, p0: number, p1: number, m0: number, m1: number) => {
	const t2 = t * t;
	const t3 = t2 * t;

	const h00 = 2 * t3 - 3 * t2 + 1;
	const h10 = t3 - 2 * t2 + t;
	const h01 = -2 * t3 + 3 * t2;
	const h11 = t3 - t2;

	return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
};

export const getDerivative = (fPrev: number, fNext: number) => {
	return (fNext - fPrev) / 2;
};

export const interpolate2DHermite = (
	values: TypedArray,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number
) => {
	// if (import.meta.env.DEV) {
	// 	if (xFraction < 0.05 && yFraction < 0.05) {
	// 		return 40;
	// 	}
	// 	if (xFraction < 0.05 && yFraction > 0.95) {
	// 		return 0;
	// 	}
	// 	if (xFraction > 0.95 && yFraction > 0.95) {
	// 		return 40;
	// 	}
	// 	if (yFraction < 0.05 && xFraction > 0.95) {
	// 		return 0;
	// 	}
	// }
	// tension = 0 is Hermite with Catmull-Rom. Tension = 1 is bilinear interpolation
	// 0.5 is somewhat in the middle
	return interpolateCardinal2D(values, nx, index, xFraction, yFraction, 0.3);
	//return interpolateRBF3x3(values, nx, index, xFraction, yFraction)
	//return interpolateRBF4x4(values, nx, index, xFraction, yFraction)
	//return interpolateSmoothBilinear(values, index, xFraction, yFraction, nx)
	//return interpolateMonotonicHermite(values, nx, index, xFraction, yFraction)
	//return interpolateGaussianBilinear(values, index, xFraction, yFraction, nx)
	//return interpolateLinear(values, index, xFraction, yFraction, nx)
	//return quinticHermite2D(values, nx, index, xFraction, yFraction)

	/*let x = index % nx;
	let y = index / nx;
	let ny = values.length / nx;
	if (x <= 1 || y <= 1 || x >= nx - 3 || y >= ny - 3) {
		return interpolateLinear(values, index, xFraction, yFraction, nx);
	}

	// Interpolate along X for each of the 4 rows
	const interpRow = [];
	for (let j = -1; j < 3; j++) {
		const p0 = values[index + j * nx];
		const p1 = values[index + j * nx + 1];
		const m0 = getDerivative(values[index + j * nx - 1], values[index + j * nx + 1]);
		const m1 = getDerivative(values[index + j * nx + 0], values[index + j * nx + 2]);
		interpRow[j + 1] = hermite(xFraction, p0, p1, m0, m1);
	}

	// Interpolate the result along Y
	const p0 = interpRow[1];
	const p1 = interpRow[2];
	const m0 = getDerivative(interpRow[0], interpRow[2]);
	const m1 = getDerivative(interpRow[1], interpRow[3]);
	return hermite(yFraction, p0, p1, m0, m1);*/
};

// 1D Quintic Hermite interpolation
export const quinticHermite = (
	t: number,
	f0: number,
	f1: number,
	m0: number,
	m1: number,
	c0: number,
	c1: number
): number => {
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

	return h0 * f0 + h1 * m0 + h2 * c0 + h3 * f1 + h4 * m1 + h5 * c1;
};

// Estimate first derivative (symmetric central)
export const derivative = (fm1: number, fp1: number): number => {
	return (fp1 - fm1) / 2;
};

// Estimate second derivative (Laplacian-like)
export const secondDerivative = (fm1: number, f0: number, fp1: number): number => {
	return fm1 - 2 * f0 + fp1;
};

// 2D Quintic Hermite Interpolation on a 6x6 or larger grid
export const quinticHermite2D = (
	values: Float32Array<ArrayBufferLike>,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number
): number => {
	// Collect interpolated values from 6 rows
	const colValues = [];

	for (let j = -2; j <= 3; j++) {
		const f0 = values[index + j * nx];
		const f1 = values[index + j * nx + 1];
		const m0 = derivative(values[index + j * nx - 1], values[index + j * nx + 1]);
		const m1 = derivative(values[index + j * nx], values[index + j * nx + 2]);
		const c0 = secondDerivative(values[index + j * nx - 1], f0, f1);
		const c1 = secondDerivative(f0, f1, values[index + j * nx + 2]);

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
};

export const getIndexFromLatLong = (
	lat: number,
	lon: number,
	domain: Domain,
	ranges: Range[] = [
		{ start: 0, end: domain.grid.ny },
		{ start: 0, end: domain.grid.nx }
	]
): IndexAndFractions => {
	const dx = domain.grid.dx;
	const dy = domain.grid.dy;

	const lonMin = domain.grid.lonMin + dx * ranges[1]['start'];
	const latMin = domain.grid.latMin + dy * ranges[0]['start'];
	const lonMax = domain.grid.lonMin + dx * ranges[1]['end'];
	const latMax = domain.grid.latMin + dy * ranges[0]['end'];

	if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) {
		return { index: NaN, xFraction: 0, yFraction: 0 };
	} else {
		const x = Math.floor((lon - lonMin) / dx);
		const y = Math.floor((lat - latMin) / dy);

		const xFraction = ((lon - lonMin) % dx) / dx;
		const yFraction = ((lat - latMin) % dy) / dy;

		const index = y * (ranges[1]['end'] - ranges[1]['start']) + x;
		return { index, xFraction, yFraction };
	}
};

export const getIndicesFromBounds = (
	south: number,
	west: number,
	north: number,
	east: number,
	domain: Domain
): [minX: number, minY: number, maxX: number, maxY: number] => {
	const dx = domain.grid.dx;
	const dy = domain.grid.dy;

	const nx = domain.grid.nx;
	const ny = domain.grid.ny;

	const minLat = domain.grid.latMin;
	const minLon = domain.grid.lonMin;

	// local sw, ne
	let s, w, n, e;
	let minX: number, minY: number, maxX: number, maxY: number;

	if (domain.grid.projection) {
		const projectionName = domain.grid.projection.name;

		const projection = new DynamicProjection(projectionName, domain.grid.projection) as Projection;
		const projectionGrid = new ProjectionGrid(projection, domain.grid);

		// const [westProjected, southProjected, eastProjected, northProjected] = getLatLonMinMaxProjected(
		// 	projectionGrid,
		// 	[s, w, n, e]
		// );
		const [x1, y1] = projectionGrid.findPointInterpolated2D(south, west);
		const [x2, y2] = projectionGrid.findPointInterpolated2D(north, east);
		minX = Math.floor(x1);
		minY = Math.floor(y1);
		maxX = Math.ceil(x2);
		maxY = Math.ceil(y2);

		return [minX, minY, maxX, maxY];
	} else {
		const xPrecision = String(dx).split('.')[1].length;
		const yPrecision = String(dy).split('.')[1].length;

		s = Number((south - (south % dy)).toFixed(yPrecision));
		w = Number((west - (west % dx)).toFixed(xPrecision));
		n = Number((north - (north % dy) + dy).toFixed(yPrecision));
		e = Number((east - (east % dx) + dx).toFixed(xPrecision));

		if (s - minLat < 0) {
			minY = 0;
		} else {
			minY = Math.floor(Math.max((s - minLat) / dy - 1, 0));
		}

		if (w - minLon < 0) {
			minX = 0;
		} else {
			minX = Math.floor(Math.max((w - minLon) / dx - 1, 0));
		}

		if (n - minLat < 0) {
			maxY = ny;
		} else {
			maxY = Math.ceil(Math.min((n - minLat) / dy + 1, ny));
		}

		if (e - minLon < 0) {
			maxX = nx;
		} else {
			maxX = Math.ceil(Math.min((e - minLon) / dx + 1, nx));
		}
		return [minX, minY, maxX, maxY];
	}
};

// 1D Cardinal Spline for 4 values
const cardinalSpline = (
	t: number,
	p0: number,
	p1: number,
	p2: number,
	p3: number,
	tension: number
): number => {
	const t2 = t * t;
	const t3 = t2 * t;
	const s = (1 - tension) / 2;

	return (
		s * (-t3 + 2 * t2 - t) * p0 +
		s * (-t3 + t2) * p1 +
		(2 * t3 - 3 * t2 + 1) * p1 +
		s * (t3 - 2 * t2 + t) * p2 +
		(-2 * t3 + 3 * t2) * p2 +
		s * (t3 - t2) * p3
	);
};

const interpolateCardinal2D = (
	values: TypedArray,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number,
	tension: number = 0 // range [0,1]. tension = 0 is Catmull-Rom
): number => {
	// Interpolate 4 rows in X
	const r0 = cardinalSpline(
		xFraction,
		values[index + -1 * nx - 1],
		values[index + -1 * nx + 0],
		values[index + -1 * nx + 1],
		values[index + -1 * nx + 2],
		tension
	);
	const r1 = cardinalSpline(
		xFraction,
		values[index + +0 * nx - 1],
		values[index + +0 * nx + 0],
		values[index + +0 * nx + 1],
		values[index + +0 * nx + 2],
		tension
	);
	const r2 = cardinalSpline(
		xFraction,
		values[index + +1 * nx - 1],
		values[index + +1 * nx + 0],
		values[index + +1 * nx + 1],
		values[index + +1 * nx + 2],
		tension
	);
	const r3 = cardinalSpline(
		xFraction,
		values[index + +2 * nx - 1],
		values[index + +2 * nx + 0],
		values[index + +2 * nx + 1],
		values[index + +2 * nx + 2],
		tension
	);

	// Interpolate in Y
	return cardinalSpline(yFraction, r0, r1, r2, r3, tension);
};

export const getBorderPoints = (projectionGrid: ProjectionGrid) => {
	const points = [];
	for (let i = 0; i < projectionGrid.ny; i++) {
		points.push([projectionGrid.origin[0], projectionGrid.origin[1] + i * projectionGrid.dy]);
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
		points.push([projectionGrid.origin[0] + i * projectionGrid.dx, projectionGrid.origin[1]]);
	}

	return points;
};

export const getBoundsFromGrid = (
	lonMin: number,
	latMin: number,
	dx: number,
	dy: number,
	nx: number,
	ny: number
): Bounds => {
	const minLon = lonMin;
	const minLat = latMin;
	const maxLon = minLon + dx * nx;
	const maxLat = minLat + dy * ny;
	return [minLon, minLat, maxLon, maxLat];
};

export const getBoundsFromBorderPoints = (
	borderPoints: number[][],
	projection: Projection
): Bounds => {
	let minLon = 180;
	let minLat = 90;
	let maxLon = -180;
	let maxLat = -90;
	for (const borderPoint of borderPoints) {
		const borderPointLatLon = projection.reverse(borderPoint[0], borderPoint[1]);
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
	return [minLon, minLat, maxLon, maxLat];
};

export const getCenterFromBounds = (bounds: Bounds): Center => {
	return {
		lng: (bounds[2] - bounds[0]) / 2 + bounds[0],
		lat: (bounds[3] - bounds[1]) / 2 + bounds[1]
	};
};

export const getCenterFromGrid = (grid: Domain['grid']): Center => {
	return {
		lng: grid.lonMin + grid.dx * (grid.nx * 0.5),
		lat: grid.latMin + grid.dy * (grid.ny * 0.5)
	};
};

export const degreesToRadians = (degree: number) => {
	return degree * (Math.PI / 180);
};

export const radiansToDegrees = (rad: number) => {
	return rad * (180 / Math.PI);
};

// const interpolateRBF4x4 = (
// 	values: Float32Array | (Float32Array & ArrayBufferLike),
// 	nx: number,
// 	index: number,
// 	xFraction: number,
// 	yFraction: number
// ): number => {
// 	const sigma = 0.65;
// 	const denom = 2 * sigma * sigma;

// 	const ny = values.length / nx;
// 	const x = (index % nx) + xFraction;
// 	const y = Math.floor(index / nx) + yFraction;

// 	const ix = Math.floor(x);
// 	const iy = Math.floor(y);

// 	let sum = 0;
// 	let weightSum = 0;

// 	for (let dy = -1; dy <= 2; dy++) {
// 		for (let dx = -1; dx <= 2; dx++) {
// 			const px = ix + dx;
// 			const py = iy + dy;

// 			if (px < 0 || px >= nx || py < 0 || py >= ny) continue;

// 			const fx = x - px;
// 			const fy = y - py;
// 			const dist2 = fx * fx + fy * fy;
// 			const weight = Math.exp(-dist2 / denom);

// 			const sampleIndex = py * nx + px;
// 			const value = values[sampleIndex];

// 			sum += value * weight;
// 			weightSum += weight;
// 		}
// 	}

// 	return weightSum > 0 ? sum / weightSum : 0;
// };

// const interpolateRBF3x3 = (
// 	values: Float32Array | (Float32Array & ArrayBufferLike),
// 	nx: number,
// 	index: number,
// 	xFraction: number,
// 	yFraction: number
// ): number => {
// 	const sigma = 0.4;
// 	const denom = 2 * sigma * sigma;

// 	const ny = values.length / nx;
// 	const x = (index % nx) + xFraction;
// 	const y = Math.floor(index / nx) + yFraction;

// 	const ix = Math.floor(x);
// 	const iy = Math.floor(y);

// 	let sum = 0;
// 	let weightSum = 0;

// 	for (let dy = -1; dy <= 1; dy++) {
// 		for (let dx = -1; dx <= 1; dx++) {
// 			const px = ix + dx;
// 			const py = iy + dy;

// 			if (px < 0 || px >= nx || py < 0 || py >= ny) continue;

// 			const fx = x - px;
// 			const fy = y - py;
// 			const dist2 = fx * fx + fy * fy;
// 			const weight = Math.exp(-dist2 / denom);

// 			const sampleIndex = py * nx + px;
// 			const value = values[sampleIndex];

// 			sum += value * weight;
// 			weightSum += weight;
// 		}
// 	}

// 	return weightSum > 0 ? sum / weightSum : 0;
// };
