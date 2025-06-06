import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import omProtocol from './om-protocol';

import { getValueFromLatLong } from './om-protocol';

import { pad } from './utils/pad';

import { domains } from './utils/domains';

import './style.css';

const domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

let map: maplibregl.Map;
const infoBox: HTMLElement | null = document.getElementById('info_box');
const mapContainer: HTMLElement | null = document.getElementById('map_container');

const timeSelected = new Date();
const variable = { value: 'temperature_2m', label: 'Temperature 2m' };
const center = {
	lng: domain.grid.lonMin + domain.grid.dx * (domain.grid.nx * 0.5),
	lat: domain.grid.latMin + domain.grid.dy * (domain.grid.ny * 0.5)
};

if (mapContainer) {
	maplibregl.addProtocol('om', omProtocol);

	map = new maplibregl.Map({
		container: mapContainer,
		style: `https://maptiler.servert.nl/styles/basic-world-no-labels/style.json`,
		center: center,
		zoom: domain?.grid.zoom,
		attributionControl: false,
		hash: true
	});

	map.on('load', () => {
		let omUrl = `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z/${variable.value}.om`;

		if (infoBox) {
			infoBox.innerHTML = `<div>Selected domain: ${domain.value}<br>Selected variable: ${variable.value}<br>Selected time: ${timeSelected.getUTCFullYear()}-${pad(timeSelected.getUTCMonth() + 1)}-${pad(timeSelected.getUTCDate())} ${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z</div>`;
		}

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

		let popup: maplibregl.Popup | undefined;
		map.on('mousemove', function (e) {
			const coordinates = e.lngLat;
			if (!popup) {
				popup = new maplibregl.Popup()
					.setLngLat(coordinates)
					.setHTML(`<span style="color:black;">Outside domain</span>`)
					.addTo(map);
			}
			const temp = getValueFromLatLong(coordinates.lat, coordinates.lng, omUrl);
			if (temp) {
				popup.setLngLat(coordinates).setHTML(
					`<span style="color:black;">${temp.toFixed(1) + 'C°'}</span>`
				);
			} else {
				popup.setLngLat(coordinates).setHTML(
					`<span style="color:black;">Outside domain</span>`
				);
			}
		});
	});
}
