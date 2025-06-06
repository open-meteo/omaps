import { colorScale } from './utils/color-scales';

import { tile2lat, tile2lon, getIndexFromLatLong, interpolate2DHermite } from './utils/math';

import { domains } from './utils/domains';

const domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);
const OPACITY = Number(import.meta.env.VITE_TILE_OPACITY);

const nx = domain.grid.nx;

const colors = colorScale({
	min: 0,
	max: 30
});

//let data;
self.onmessage = async (message) => {
	if (message.data.type == 'GT') {
		const key = message.data.key;
		const x = message.data.x;
		const y = message.data.y;
		const z = message.data.z;
		const data = message.data.data;

		const pixels = TILE_SIZE * TILE_SIZE;
		const rgba = new Uint8ClampedArray(pixels * 4);

		for (let i = 0; i < TILE_SIZE; i++) {
			const lat = tile2lat(y + i / TILE_SIZE, z);
			for (let j = 0; j < TILE_SIZE; j++) {
				const ind = j + i * TILE_SIZE;
				const lon = tile2lon(x + j / TILE_SIZE, z);

				const { index, xFraction, yFraction } = getIndexFromLatLong(
					lat,
					lon
				);
				//const px = interpolateLinear(data, index, xFraction, yFraction);
				const px = interpolate2DHermite(
					data,
					nx,
					index,
					xFraction,
					yFraction
				);
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

		postMessage({ type: 'RT', tile: tile, key: key });
		self.close();
	}
};
