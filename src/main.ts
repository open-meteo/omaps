import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import './style.css';

import * as turf from '@turf/turf';

import { pad } from './utils/pad';
import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import omProtocol from './om-protocol';

import { getIndexFromLatLong } from './om-protocol';

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

let data;

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

		map.on('click', function (e) {
			var coordinates = e.lngLat;
			const index = getIndexFromLatLong(coordinates.lat, coordinates.lng);
			console.log(data[index].toFixed(2) + 'C°');
		});

		loadOmFile();

		const radius = 20; // kilometer
		const options = {
			steps: 64,
			units: 'kilometers'
		};
		const bboxBegin = turf.circle(
			[domain.grid.lonMin, domain.grid.latMin],
			radius,
			options
		);
		const bboxEnd = turf.circle(
			[
				domain.grid.lonMin + domain.grid.dx * domain.grid.nx,
				domain.grid.latMin + domain.grid.dy * domain.grid.ny
			],
			17,
			options
		);

		// Add the circle as a GeoJSON source
		map.addSource('location-radius', {
			type: 'geojson',
			data: turf.featureCollection([bboxBegin, bboxEnd])
		});

		// Add a fill layer with some transparency
		map.addLayer({
			id: 'location-radius',
			type: 'fill',
			source: 'location-radius',
			paint: {
				'fill-color': '#8CCFFF',
				'fill-opacity': 0.5
			}
		});

		// Add a line layer to draw the circle outline
		map.addLayer({
			id: 'location-radius-outline',
			type: 'line',
			source: 'location-radius',
			paint: {
				'line-color': '#0094ff',
				'line-width': 3
			}
		});
	});
}

const loadOmFile = async () => {
	// let url = `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z/${variable.value}.om`;

	let backend = new MemoryHttpBackend({
		url: './data/temperature_2m.om',
		maxFileSize: 500 * 1024 * 1024 // 500 MB
	});
	let reader = await OmFileReader.create(backend);
	if (reader) {
		const dimensions = reader.getDimensions();

		// Create ranges for each dimension
		const ranges = dimensions.map((dim, _) => {
			return { start: 0, end: dim };
		});
		data = await reader.read(OmDataType.FloatArray, ranges);

		const coordinates = [];
		for (let [i, _] of new Array(dimensions[0] - 1).entries()) {
			for (let [j, _] of new Array(dimensions[1] - 1).entries()) {
				coordinates.push({
					lng: domain.grid.lonMin + domain.grid.dx * j,
					lat: domain.grid.latMin + domain.grid.dy * i,
					row: i,
					column: j
				});
			}
		}

		const tileCoords = [];
		let hits = 0;

		for (let [index, coordinate] of coordinates.entries()) {
			if (
				coordinate.lng >= tileBounds[0][0] &&
				coordinate.lng <= tileBounds[2][0] &&
				coordinate.lat >= tileBounds[0][1] &&
				coordinate.lat <= tileBounds[2][1]
			) {
				//if (index % Math.round(arraySize / 500) === 0) {
				const el = document.createElement('div');
				el.className = 'marker';
				el.style.width = `${14}px`;
				el.style.height = `${14}px`;
				el.innerHTML = `<span style="font-size: 12px; color: rgba(0,0,0,0.6);">${data[index].toFixed(2)}C°</span>`;

				let marker;
				if (!isNaN(data[index])) {
					setTimeout(() => {
						marker = new maplibregl.Marker({ element: el })
							.setLngLat({
								lng: coordinate.lng,
								lat: coordinate.lat + 0.01
							})
							.addTo(map);
					}, 30 * hits);
					hits++;
				}
				coordinate['marker'] = marker;
				coordinate['temperature'] = data[index];
				coordinate['index'] = index;

				tileCoords.push(coordinate);
			}
		}

		console.log(data.length, coordinates.length);
	}
};
