import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { omProtocol } from './om-protocol';

import { getValueFromLatLong } from './om-protocol';

import { pad } from './utils/pad';

import { domains, domainGroups } from './utils/domains';
import { variables } from './utils/variables';

import './style.css';

import type { Variable, Domain, DomainGroups } from './types';

let url = new URL(document.location.href);
let params = new URLSearchParams(url.search);

let domain: Domain;
if (params.get('domain')) {
	domain = domains.find((dm) => dm.value === params.get('domain')) ?? domains[0];
} else {
	domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
}

const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

let map: maplibregl.Map;
const infoBox: HTMLElement | null = document.getElementById('info_box');
const mapContainer: HTMLElement | null = document.getElementById('map_container');

let omUrl: string;
let timeSelected = new Date();
let urlTime = params.get('time');
if (urlTime) {
	const timeString = urlTime.slice(0, 13) + ':' + urlTime.slice(13);
	timeSelected = new Date(timeString);
}

let variable: Variable;
if (params.get('variable')) {
	variable = variables.find((v) => v.value === params.get('variable')) ?? variables[0];
} else {
	variable = variables.find((v) => v.value === import.meta.env.VITE_VARIABLE) ?? variables[0];
}

const getDomainOptions = () => {
	let optGroups: DomainGroups = {};
	for (let dg of domainGroups) {
		const dgArray = [];
		for (let d of domains) {
			if (d.value.startsWith(dg)) {
				dgArray.push(d);
			}
		}
		optGroups[dg] = dgArray;
	}
	let string = '';
	for (let [og, doms] of Object.entries(optGroups)) {
		string += `<optgroup label="${og.replace('_', ' ')}">`;
		for (let d of doms) {
			string += `<option value=${d.value} ${domain.value === d.value ? 'selected' : ''}>${d.label}</option>`;
		}
		string += `</optgroup>`;
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

let source: maplibregl.Map;
let domainSelector: HTMLInputElement,
	variableSelector: HTMLInputElement,
	dateTimeSelector: HTMLInputElement;
let checkSourceLoadedInterval: ReturnType<typeof setInterval>;
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
		tileSize: TILE_SIZE,
		volatile: import.meta.env.DEV
	});

	map.addLayer(
		{
			source: 'omFileSource',
			id: 'omFileLayer',
			type: 'raster'
		},
		'road_area_pier'
	);
	checkSourceLoadedInterval = setInterval(() => {
		checked++;
		if (source.loaded() || checked >= 30) {
			domainSelector.disabled = false;
			variableSelector.disabled = false;
			dateTimeSelector.disabled = false;
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
		center: typeof domain.grid.center == 'object' ? domain.grid.center : [0, 0],
		zoom: domain?.grid.zoom,
		attributionControl: false
		// hash: true
	});

	map.on('load', () => {
		omUrl = getOMUrl();
		source = map.addSource('omFileSource', {
			type: 'raster',
			url: 'om://' + omUrl,
			tileSize: TILE_SIZE,
			volatile: import.meta.env.DEV
		});

		map.addLayer(
			{
				source: 'omFileSource',
				id: 'omFileLayer',
				type: 'raster'
			},
			'road_area_pier'
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
				let value = getValueFromLatLong(
					coordinates.lat,
					coordinates.lng,
					omUrl
				);
				if (value) {
					let string;
					if (Array === value.constructor) {
						string = '';
						for (let val of value) {
							string += val.toFixed(1) + '  ';
						}
					} else {
						string =
							value.toFixed(1) +
							(variable.value.startsWith('temperature')
								? 'C°'
								: '');
					}

					popup.setLngLat(coordinates).setHTML(
						`<span style="color:black;">${string}</span>`
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
			infoBox.innerHTML = `<div>Selected domain: <select id="domain_selection" class="domain-selection" name="domains" value="${domain.value}">${getDomainOptions()}</select><br>Selected variable: <select id="variable_selection" class="variable-selection" name="variables" value="${variable.value}">${getVariableOptions()}</select><br>Selected time: <input class="date-time-selection" type="datetime-local"  id="date_time_selection" value="${timeSelected.getFullYear() + '-' + pad(timeSelected.getMonth() + 1) + '-' + pad(timeSelected.getDate()) + 'T' + pad(Number(timeSelected.getHours() + (timeSelected.getMinutes() > 1 ? 1 : 0))) + ':00'}"/></div>`;

			domainSelector = document.querySelector(
				'#domain_selection'
			) as HTMLInputElement;
			domainSelector?.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target) {
					domain =
						domains.find((dm) => dm.value === target.value) ??
						domains[0];

					// map.flyTo({
					// 	center:
					// 		typeof domain.grid.center == 'object'
					// 			? domain.grid.center
					// 			: [0, 0],
					// 	zoom: domain.grid.zoom
					// });
					url.searchParams.set('domain', target.value);
					history.pushState({}, '', url);
					changeOMfileURL();
				}
			});

			variableSelector = document.querySelector(
				'#variable_selection'
			) as HTMLInputElement;
			variableSelector?.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target) {
					variable =
						variables.find((v) => v.value === target.value) ??
						variables[0];
					url.searchParams.set('variable', target.value);
					history.pushState({}, '', url);
					changeOMfileURL();
				}
			});

			dateTimeSelector = document.querySelector(
				'#date_time_selection'
			) as HTMLInputElement;
			dateTimeSelector?.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target) {
					timeSelected = new Date(target.value);
					url.searchParams.set('time', target.value.replace(':', ''));
					history.pushState({}, '', url);

					changeOMfileURL();
				}
			});
		}
	});
}
