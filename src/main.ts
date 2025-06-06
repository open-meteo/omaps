import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import omProtocol from './om-protocol';

import { getValueFromLatLong } from './om-protocol';

import { pad } from './utils/pad';

import { domains } from './utils/domains';
import { variables } from './utils/variables';

import './style.css';

let domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

let map: maplibregl.Map;
const infoBox: HTMLElement | null = document.getElementById('info_box');
const mapContainer: HTMLElement | null = document.getElementById('map_container');

let omUrl;
let timeSelected = new Date();
let variable = variables.find((v) => v.value === import.meta.env.VITE_VARIABLE) ?? variables[0];
const center = {
	lng: domain.grid.lonMin + domain.grid.dx * (domain.grid.nx * 0.5),
	lat: domain.grid.latMin + domain.grid.dy * (domain.grid.ny * 0.5)
};

const getDomainOptions = () => {
	let string = '';
	for (let d of domains) {
		string += `<option value=${d.value} ${domain.value === d.value ? 'selected' : ''}>${d.label}</option>`;
	}
	return string;
};

const getVariableOptions = () => {
	let string = '';
	for (let v of variables) {
		string += `<option value=${v.value} ${variable.value === v.value ? 'selected' : ''}>${v.label}</option>`;
	}
	return string;
};

const getOMUrl = () => {
	return `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours()))}00Z/${variable.value}.om`;
};

let source;
let domainSelector, variableSelector, dateTimeSelector;
let checkSourceLoadedInterval;
let checked = 0;
const changeOMfileURL = () => {
	omUrl = getOMUrl();
	map.removeLayer('omFileLayer');
	map.removeSource('omFileSource');

	domainSelector.disabled = true;
	variableSelector.disabled = true;
	dateTimeSelector.disabled = true;

	source = map.addSource('omFileSource', {
		type: 'raster',
		url: 'om://' + omUrl,
		tileSize: TILE_SIZE
	});

	map.addLayer(
		{
			source: 'omFileSource',
			id: 'omFileLayer',
			type: 'raster'
		},
		'waterway'
	);

	checkSourceLoadedInterval = setInterval(() => {
		checked++;
		if (source.loaded() || checked >= 30) {
			domainSelector.disabled = null;
			variableSelector.disabled = null;
			dateTimeSelector.disabled = null;
			checked = 0;
			clearInterval(checkSourceLoadedInterval);
		}
	}, 100);
};

let showTemp = false;
if (mapContainer) {
	maplibregl.addProtocol('om', omProtocol);

	map = new maplibregl.Map({
		container: mapContainer,
		style: `https://maptiler.servert.nl/styles/basic-world-maps/style.json`,
		center: center,
		zoom: domain?.grid.zoom,
		attributionControl: false,
		hash: true
	});

	map.on('load', () => {
		omUrl = getOMUrl();
		source = map.addSource('omFileSource', {
			type: 'raster',
			url: 'om://' + omUrl,
			tileSize: TILE_SIZE
		});

		map.addLayer(
			{
				source: 'omFileSource',
				id: 'omFileLayer',
				type: 'raster'
			},
			'waterway'
		);

		let popup: maplibregl.Popup | undefined;
		map.on('mousemove', function (e) {
			if (showTemp) {
				const coordinates = e.lngLat;
				if (!popup) {
					popup = new maplibregl.Popup()
						.setLngLat(coordinates)
						.setHTML(
							`<span style="color:black;">Outside domain</span>`
						)
						.addTo(map);
				}
				const temp = getValueFromLatLong(
					coordinates.lat,
					coordinates.lng,
					omUrl
				);
				if (temp) {
					popup.setLngLat(coordinates).setHTML(
						`<span style="color:black;">${temp.toFixed(1) + (variable.value.startsWith('temperature') ? 'C°' : '')}</span>`
					);
				} else {
					popup.setLngLat(coordinates).setHTML(
						`<span style="color:black;">Outside domain</span>`
					);
				}
			}
		});

		map.on('click', (e) => {
			showTemp = !showTemp;
			if (!showTemp && popup) {
				popup.remove();
			}
			if (showTemp && popup) {
				const coordinates = e.lngLat;
				popup.setLngLat(coordinates).addTo(map);
			}
		});

		if (infoBox) {
			infoBox.innerHTML = `<div>Selected domain: <select id="domain_selection" class="domain-selection" name="domains" value="${domain.value}">${getDomainOptions()}</select><br>Selected variable: <select id="variable_selection" class="variable-selection" name="variables" value="${variable.value}">${getVariableOptions()}</select><br>Selected time: <input class="date-time-selection" type="datetime-local"  id="date_time_selection" value="${timeSelected.getFullYear() + '-' + pad(timeSelected.getMonth() + 1) + '-' + pad(timeSelected.getDate()) + 'T' + Number(timeSelected.getHours() + 1) + ':00'}"/></div>`;
			domainSelector = document.querySelector('#domain_selection');
			domainSelector?.addEventListener('change', (e) => {
				domain =
					domains.find((dm) => dm.value === e.target.value) ??
					domains[0];
				changeOMfileURL();
			});

			variableSelector = document.querySelector('#variable_selection');
			variableSelector?.addEventListener('change', (e) => {
				variable =
					variables.find((v) => v.value === e.target.value) ??
					variables[0];
				changeOMfileURL();
			});

			dateTimeSelector = document.querySelector('#date_time_selection');
			dateTimeSelector?.addEventListener('change', (e) => {
				timeSelected = new Date(e.target.value);
				changeOMfileURL();
			});
		}
	});
}
