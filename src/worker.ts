import { colorScale } from './utils/color-scales';

import { hideZero } from './utils/variables';

import { DynamicProjection, ProjectionGrid, type Projection } from './utils/projection';

import {
	tile2lat,
	tile2lon,
	getIndexFromLatLong,
	interpolateLinear,
	interpolate2DHermite,
	degreesToRadians
} from './utils/math';

import type { TypedArray } from '@openmeteo/file-reader';
import type { Domain } from './types';

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);
const OPACITY = Number(import.meta.env.VITE_TILE_OPACITY);

const rotatePoint = (cx: number, cy: number, theta: number, x: number, y: number) => {
	let xt = Math.cos(theta) * (x - cx) - Math.sin(theta) * (y - cy) + cx;
	let yt = Math.sin(theta) * (x - cx) + Math.cos(theta) * (y - cy) + cy;

	return [xt, yt];
};

const drawArrow = (
	rgba: Uint8ClampedArray,
	iBase: number,
	jBase: number,
	x: number,
	y: number,
	z: number,
	nx: number,
	domain: Domain,
	projectionGrid: ProjectionGrid,
	directions: TypedArray,
	boxSize = TILE_SIZE / 8,
	arrowTipLength = 6
): void => {
	const arrowCoords = [];

	for (let bs = 0; bs < boxSize; bs++) {
		arrowCoords.push([iBase + bs, jBase + boxSize / 2]);
	}
	for (let at = 0; at < arrowTipLength; at++) {
		arrowCoords.push([iBase + at, jBase + (boxSize / 2 + at)]);
		arrowCoords.push([iBase + at, jBase + (boxSize / 2 - at)]);
	}

	const arrowCoordsRotated = [];
	const arrowIndices = [];

	let iCenter = iBase + boxSize / 2;
	let jCenter = jBase + boxSize / 2;

	const lat = tile2lat(y + iCenter / TILE_SIZE, z);
	const lon = tile2lon(x + jCenter / TILE_SIZE, z);

	const { index, xFraction, yFraction } = getIndexAndFractions(
		lat,
		lon,
		domain,
		projectionGrid
	);

	let direction = degreesToRadians(
		interpolateLinear(directions, nx, index, xFraction, yFraction)
	);

	for (let arrow of arrowCoords) {
		let rotatedPoint = rotatePoint(iCenter, jCenter, -direction, arrow[0], arrow[1]);
		arrowCoordsRotated.push([Math.floor(rotatedPoint[0]), Math.floor(rotatedPoint[1])]);
	}

	for (let arrow of arrowCoordsRotated) {
		arrowIndices.push(arrow[1] + arrow[0] * TILE_SIZE);
	}

	for (let arrowIndex of arrowIndices) {
		rgba[4 * arrowIndex] = 0;
		rgba[4 * arrowIndex + 1] = 0;
		rgba[4 * arrowIndex + 2] = 0;
		rgba[4 * arrowIndex + 3] = 155;
	}
};

const getIndexAndFractions = (lat: number, lon: number, domain: Domain, projectionGrid) => {
	let indexObject;
	if (domain.grid.projection && projectionGrid) {
		indexObject = projectionGrid.findPointInterpolated(lat, lon);
	} else {
		indexObject = getIndexFromLatLong(lat, lon, domain);
	}

	return (
		indexObject ?? {
			index: 0,
			xFraction: 0,
			yFraction: 0
		}
	);
};

let colors;
self.onmessage = async (message) => {
	if (message.data.type == 'GT') {
		const key = message.data.key;
		const x = message.data.x;
		const y = message.data.y;
		const z = message.data.z;
		const values = message.data.data.values;
		const direction = message.data.data.direction;

		const domain = message.data.domain;
		const variable = message.data.variable;
		const nx = domain.grid.nx;

		const pixels = TILE_SIZE * TILE_SIZE;
		const rgba = new Uint8ClampedArray(pixels * 4);

		if (variable.value == 'cloud_cover') {
			colors = colorScale({
				colorScheme: '',
				customColors: ['#999', '#444'],
				min: 0,
				max: 100
			});
		} else if (variable.value == 'pressure_msl') {
			colors = colorScale({
				min: 990,
				max: 1020
			});
		} else {
			colors = colorScale({
				min: 0,
				max: 30
			});
		}

		let projectionGrid;
		if (domain.grid.projection) {
			const ny = domain.grid.ny;
			const latitude = domain.grid.projection.latitude ?? domain.grid.latMin;
			const longitude = domain.grid.projection.longitude ?? domain.grid.lonMin;
			const dx = domain.grid.dx;
			const dy = domain.grid.dy;
			const projectOrigin = domain.grid.projection.projectOrigin ?? true;

			let projectionName = domain.grid.projection.name;

			const projection = new DynamicProjection(
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

		for (let i = 0; i < TILE_SIZE; i++) {
			const lat = tile2lat(y + i / TILE_SIZE, z);
			for (let j = 0; j < TILE_SIZE; j++) {
				const ind = j + i * TILE_SIZE;
				const lon = tile2lon(x + j / TILE_SIZE, z);

				const { index, xFraction, yFraction } = getIndexAndFractions(
					lat,
					lon,
					domain,
					projectionGrid
				);

				let px = interpolate2DHermite(
					values,
					nx,
					index,
					xFraction,
					yFraction
				);

				if (hideZero.includes(variable.value)) {
					if (Math.floor(px) <= 0.1) {
						px = NaN;
					}
				}

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
						if (variable.value == 'cloud_cover') {
							rgba[4 * ind + 3] = 255 * (px / 100);
						} else {
							rgba[4 * ind + 3] = 255 * (OPACITY / 100);
						}
					}
				}
			}
		}

		if (variable.value === 'wind') {
			for (let i = 0; i < TILE_SIZE; i += TILE_SIZE / 8) {
				for (let j = 0; j < TILE_SIZE; j += TILE_SIZE / 8) {
					drawArrow(
						rgba,
						i,
						j,
						x,
						y,
						z,
						nx,
						domain,
						projectionGrid,
						direction
					);
				}
			}
		}

		const tile = await createImageBitmap(new ImageData(rgba, TILE_SIZE, TILE_SIZE));

		postMessage({ type: 'RT', tile: tile, key: key });
		self.close();
	}
};
