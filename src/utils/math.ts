import { type Domain } from '../types';

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

const interpolateLinear = (
	data: Float32Array<ArrayBufferLike>,
	index: number,
	xFraction: number,
	yFraction: number,
	nx: number
): number => {
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
	data: Float32Array<ArrayBufferLike>,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number
) => {
	if (xFraction > 0.45 && xFraction < 0.55 && yFraction > 0.45 && yFraction < 0.55) {
		// print grid point
		return 0;
	}
	// tension = 0 is Hermite with Catmull-Rom. Tension = 1 is bilinear interpolation
	// 0.5 is somewhat in the middle
	return interpolateCardinal2D(data, nx, index, xFraction, yFraction, 0.2);

	/*let x = index % nx;
	let y = index / nx;
	let ny = data.length / nx;
	if (x <= 1 || y <= 1 || x >= nx - 3 || y >= ny - 3) {
		return interpolateLinear(data, index, xFraction, yFraction, nx);
	}

	// Interpolate along X for each of the 4 rows
	const interpRow = [];
	for (let j = -1; j < 3; j++) {
		const p0 = data[index + j * nx];
		const p1 = data[index + j * nx + 1];
		const m0 = getDerivative(data[index + j * nx - 1], data[index + j * nx + 1]);
		const m1 = getDerivative(data[index + j * nx + 0], data[index + j * nx + 2]);
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
	data: Float32Array<ArrayBufferLike>,
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number
): number => {
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
};

export const getIndexFromLatLong = (lat: number, lon: number, domain: Domain) => {
	if (
		lat < domain.grid.latMin ||
		lat > domain.grid.latMin + domain.grid.dy * domain.grid.ny ||
		lon < domain.grid.lonMin ||
		lon > domain.grid.lonMin + domain.grid.dx * domain.grid.nx
	) {
		return { index: NaN, xFraction: 0, yFraction: 0 };
	} else {
		const x = (lon - domain.grid.lonMin) / domain.grid.dx;
		const y = (lat - domain.grid.latMin) / domain.grid.dy;

		const xFraction = ((lon - domain.grid.lonMin) % domain.grid.dx) / domain.grid.dx;
		const yFraction = ((lat - domain.grid.latMin) % domain.grid.dy) / domain.grid.dy;

		const index = Math.floor(y) * domain.grid.nx + Math.floor(x);
		return { index, xFraction, yFraction };
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
	data: Float32Array | (Float32Array & ArrayBufferLike),
	nx: number,
	index: number,
	xFraction: number,
	yFraction: number,
	tension: number = 0 // range [0,1]. tension = 0 is Catmull-Rom
): number => {
	// Interpolate 4 rows in X
	const r0 = cardinalSpline(
		xFraction,
		data[index + -1 * nx - 1],
		data[index + -1 * nx + 0],
		data[index + -1 * nx + 1],
		data[index + -1 * nx + 2],
		tension
	);
	const r1 = cardinalSpline(
		xFraction,
		data[index + +0 * nx - 1],
		data[index + +0 * nx + 0],
		data[index + +0 * nx + 1],
		data[index + +0 * nx + 2],
		tension
	);
	const r2 = cardinalSpline(
		xFraction,
		data[index + +1 * nx - 1],
		data[index + +1 * nx + 0],
		data[index + +1 * nx + 1],
		data[index + +1 * nx + 2],
		tension
	);
	const r3 = cardinalSpline(
		xFraction,
		data[index + +2 * nx - 1],
		data[index + +2 * nx + 0],
		data[index + +2 * nx + 1],
		data[index + +2 * nx + 2],
		tension
	);

	// Interpolate in Y
	return cardinalSpline(yFraction, r0, r1, r2, r3, tension);
};

export const degreesToRadians = (degree: number) => {
	return degree * (Math.PI / 180);
};

export const radiansToDegrees = (rad: number) => {
	return rad * (180 / Math.PI);
};
