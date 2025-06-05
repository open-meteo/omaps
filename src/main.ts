import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import './style.css';

import * as turf from '@turf/turf';

import { pad } from './utils/pad';

import omProtocol from './om-protocol';

import { getValueFromLatLong } from './om-protocol';

export const TILE_SIZE = 256;

let map: maplibregl.Map;
const infoBox: HTMLElement | null = document.getElementById('info_box');
const mapContainer: HTMLElement | null = document.getElementById('map_container');

let domain = {
	value: 'dwd_icon_d2',
	label: ' DWD ICON D2',
	grid: { nx: 1215, ny: 746, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, zoom: 3.75 }
};

let timeSelected = new Date();
let variable = { value: 'temperature_2m', label: 'Temperature 2m' };

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

const domainPoly = turf.polygon([boundsDomain]);

if (mapContainer) {
	maplibregl.addProtocol('om', omProtocol);

	map = new maplibregl.Map({
		container: mapContainer,
		style: `https://maptiler.servert.nl/styles/basic-world-no-labels/style.json`,
		center: [8.6, 46.9],
		zoom: 4,
		attributionControl: false,
		hash: true
	});

	map.on('load', () => {
		let omUrl = `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z/${variable.value}.om`;

		if (infoBox) {
			infoBox.innerHTML = `<div>Selected domain: ${domain.value}<br>Selected variable: ${variable.value}<br>Selected time: ${timeSelected.getUTCFullYear()}-${pad(timeSelected.getUTCMonth() + 1)}-${pad(timeSelected.getUTCDate())} ${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z</div>`;
		}

		map.addSource('domain-area', {
			type: 'geojson',
			data: domainPoly
		});
		map.addLayer({
			id: 'domain-areas',
			type: 'line',
			source: 'domain-area',
			paint: {
				'line-color': 'orange',
				'line-opacity': 0.8
			}
		});

		map.addSource('omFileSource', {
			type: 'raster',
			url: 'om://' + omUrl,
			tileSize: TILE_SIZE
		});

		map.addLayer({
			source: 'omFileSource',
			id: 'omFileLayer',
			type: 'raster'
		});

		map.on('click', function (e) {
			var coordinates = e.lngLat;
			const temp = getValueFromLatLong(coordinates.lat, coordinates.lng, omUrl);
			if (temp) {
				console.log(temp.toFixed(2) + 'C°');
				new maplibregl.Popup()
					.setLngLat(coordinates)
					.setHTML(
						`<span style="color:black;">${temp.toFixed(2) + 'C°'}</span>`
					)
					.addTo(map);
			} else {
				new maplibregl.Popup()
					.setLngLat(coordinates)
					.setHTML(`<span style="color:black;">Outside domain</span>`)
					.addTo(map);
			}
		});
	});
}
