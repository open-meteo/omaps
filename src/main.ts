import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import './style.css';

import * as turf from '@turf/turf';

import omProtocol from './om-protocol';

let map: maplibregl.Map;
const mapContainer: HTMLElement | null = document.getElementById('map_container');

let domain = {
	value: 'dwd_icon_d2',
	label: ' DWD ICON D2',
	grid: { nx: 1214, ny: 745, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, zoom: 3.75 }
};
let arraySize = domain.grid.nx * domain.grid.ny;
let timeSelected = new Date();
let variable = { value: 'temperature_2m', label: 'Temperature 2m' };

const tileBounds = [
	[8.44, 46.8],
	[8.79, 46.8],
	[8.79, 47.04],
	[8.44, 47.04],
	[8.44, 46.8]
];
const boundsDomain = [
	[domain.grid.lonMin, domain.grid.latMin],
	[domain.grid.lonMin + domain.grid.dx * domain.grid.nx, domain.grid.latMin],
	[
		domain.grid.lonMin + domain.grid.dx * domain.grid.nx,
		domain.grid.latMin + domain.grid.dy * domain.grid.ny
	],
	[domain.grid.lonMin, domain.grid.latMin + domain.grid.dy * domain.grid.ny],
	[domain.grid.lonMin, domain.grid.latMin]
];

const tilePoly = turf.polygon([tileBounds]);
const domainPoly = turf.polygon([boundsDomain]);

if (mapContainer) {
	maplibregl.addProtocol('om', omProtocol);

	map = new maplibregl.Map({
		container: mapContainer,
		style: `https://maptiler.servert.nl/styles/basic-world/style.json`,
		center: [8.6, 46.9],
		zoom: 4,
		attributionControl: false,
		hash: true
	});

	map.showTileBoundaries = true;

	map.on('load', () => {
		map.addSource('tile-area', {
			type: 'geojson',
			data: tilePoly
		});
		map.addLayer({
			id: 'tile-areas',
			type: 'fill',
			source: 'tile-area',
			paint: {
				'fill-color': 'orange',
				'fill-opacity': 0.08
			}
		});

		map.addSource('domain-area', {
			type: 'geojson',
			data: domainPoly
		});
		map.addLayer({
			id: 'domain-areas',
			type: 'fill',
			source: 'domain-area',
			paint: {
				'fill-color': 'red',
				'fill-opacity': 0.08
			}
		});

		map.addSource('omFileSource', {
			type: 'raster',
			url: 'om://./data/temperature_2m.om',
			tileSize: 256
		});

		map.addLayer({
			source: 'omFileSource',
			id: 'omFileLayer',
			type: 'raster'
		});
	});
}

// const loadOmFile = async () => {
// 	let url = `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z/${variable.value}.om`;

// 		const coordinates = [];
// 		for (let [i, _] of new Array(dimensions[0]).entries()) {
// 			for (let [j, _] of new Array(dimensions[1]).entries()) {
// 				coordinates.push({
// 					lng: domain.grid.lonMin + domain.grid.dx * j,
// 					lat: domain.grid.latMin + domain.grid.dy * i
// 				});
// 			}
// 		}

// 		const tileCoords = [];

// 		for (let [index, coordinate] of coordinates.entries()) {
// 			if (
// 				coordinate.lng >= tileBounds[0][0] &&
// 				coordinate.lng <= tileBounds[2][0] &&
// 				coordinate.lat >= tileBounds[0][1] &&
// 				coordinate.lat <= tileBounds[2][1]
// 			) {
// 				const el = document.createElement('div');
// 				el.className = 'marker';
// 				el.style.width = `${14}px`;
// 				el.style.height = `${14}px`;
// 				el.innerHTML = `<span style="font-size: 12px; color: rgba(0,0,0,0.6);">${data[index].toFixed(0)}</span>`;

// 				let marker;
// 				if (!isNaN(data[index])) {
// 					marker = new maplibregl.Marker({ element: el })
// 						.setLngLat({
// 							lng: coordinate.lng,
// 							lat: coordinate.lat
// 						})
// 						.addTo(map);
// 				}
// 				coordinate['marker'] = marker;
// 				coordinate['temperature'] = data[index];

// 				tileCoords.push(coordinate);
// 			}
// 		}

// 		const pixels = TILE_SIZE * TILE_SIZE;
// 		const rgba = new Uint8ClampedArray(pixels * 4);

// 		const interpolate = colorScale({
// 			min: 15,
// 			max: 25
// 		});

// 		for (let i = 0; i < pixels; i++) {
// 			const px = 20;
// 			if (isNaN(px) || px === Infinity) {
// 				rgba[4 * i] = 0;
// 				rgba[4 * i + 1] = 0;
// 				rgba[4 * i + 2] = 0;
// 				rgba[4 * i + 3] = 0;
// 			} else {
// 				const color = interpolate(px);
// 				rgba[4 * i] = color[0];
// 				rgba[4 * i + 1] = color[1];
// 				rgba[4 * i + 2] = color[2];
// 				rgba[4 * i + 3] = 255;
// 			}
// 		}

// 		const image = await createImageBitmap(new ImageData(rgba, TILE_SIZE, TILE_SIZE));

// 		console.log(tileCoords, rgba, image);
// 	}
// };
