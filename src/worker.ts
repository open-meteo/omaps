import { colorScale } from './utils/color-scales';

import { tile2lat, tile2lon, getIndexFromLatLong, interpolate2DHermite } from './utils/math';
import { DynamicProjection, ProjectionGrid } from './utils/projection';
import { hideZero } from './utils/variables';

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);
const OPACITY = Number(import.meta.env.VITE_TILE_OPACITY);

let colors;
self.onmessage = async (message) => {
	if (message.data.type == 'GT') {
		// const start = performance.now();

		const key = message.data.key;
		const x = message.data.x;
		const y = message.data.y;
		const z = message.data.z;
		const data = message.data.data;

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
			const latMin = domain.grid.latMin;
			const lonMin = domain.grid.lonMin;
			const dx = domain.grid.dx;
			const dy = domain.grid.dy;

			let λ0 = domain.grid.projection.λ0;
			let ϕ0 = domain.grid.projection.ϕ0;
			let ϕ1 = domain.grid.projection.ϕ1;
			let ϕ2 = domain.grid.projection.ϕ2;
			let radius = domain.grid.projection.radius;
			let projectionName = domain.grid.projection.name;

			const projection = new DynamicProjection(projectionName, [
				λ0,
				ϕ0,
				ϕ1,
				ϕ2,
				radius
			]);
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

		for (let i = 0; i < TILE_SIZE; i++) {
			const lat = tile2lat(y + i / TILE_SIZE, z);
			for (let j = 0; j < TILE_SIZE; j++) {
				const ind = j + i * TILE_SIZE;
				const lon = tile2lon(x + j / TILE_SIZE, z);

				let indexObject;
				if (domain.grid.projection) {
					indexObject = projectionGrid.findPointInterpolated(
						lat,
						lon
					);
				} else {
					indexObject = getIndexFromLatLong(lat, lon, domain);
				}

				const { index, xFraction, yFraction } = indexObject ?? {
					index: 0,
					xFraction: 0,
					yFraction: 0
				};

				let px = interpolate2DHermite(
					data,
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

		const tile = await createImageBitmap(new ImageData(rgba, TILE_SIZE, TILE_SIZE));

		postMessage({ type: 'RT', tile: tile, key: key });
		// console.log(
		// 	`getTileWorker(${x}/${y}/${z}): elapsed time: ${(performance.now() - start).toFixed(3)} ms`
		// );
		self.close();
	}
};
