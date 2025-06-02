import { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { OmFileReader, OmDataType, MemoryHttpBackend } from '@openmeteo/file-reader';

import { pad } from './utils/pad';

import './style.css';

let map: Map;
const mapContainer: HTMLElement | null = document.getElementById('map_container');

let domain = {
	value: 'dwd_icon_d2',
	label: ' DWD ICON D2',
	grid: { nx: 1214, ny: 745, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, zoom: 3.75 }
};
let arraySize = domain.grid.nx * domain.grid.ny;
let timeSelected = new Date();
let variable = { value: 'temperature_2m', label: 'Temperature 2m' };

if (mapContainer) {
	map = new Map({
		container: mapContainer,
		style: `https://maptiler.servert.nl/styles/basic-world/style.json`,
		center: [8.2, 50.63],
		zoom: 3.75,
		attributionControl: false
	});

	map.on('load', () => {
		loadOmFile();
	});
}

const loadOmFile = async () => {
	let url = `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours() / 3.0) * 3)}00Z/${variable.value}.om`;

	// Create a reader with a file backend
	let backend = new MemoryHttpBackend({
		url: url,
		maxFileSize: 500 * 1024 * 1024 // 500 MB
	});
	let reader = await OmFileReader.create(backend);
	if (reader) {
		const dimensions = reader.getDimensions();

		// Create ranges for each dimension
		const ranges = dimensions.map((dim, _) => {
			return { start: 0, end: dim };
		});
		const data = await reader.read(OmDataType.FloatArray, ranges);

		console.log(data);

		const coordinates = [];
		for (let [i, _] of new Array(dimensions[0]).entries()) {
			for (let [j, _] of new Array(dimensions[1]).entries()) {
				coordinates.push({
					lng: domain.grid.lonMin + domain.grid.dx * j,
					lat: domain.grid.latMin + domain.grid.dy * i
				});
			}
		}

		for (let [index, coordinate] of coordinates.entries()) {
			if (index % Math.round(arraySize / 1200) === 0) {
				const el = document.createElement('div');
				el.className = 'marker';
				el.style.width = `${14}px`;
				el.style.height = `${14}px`;
				el.innerHTML = `<span style="font-size: 12px; color: black;">${data[index].toFixed(0)}</span>`;

				if (!isNaN(data[index])) {
					new Marker({ element: el })
						.setLngLat({ lng: coordinate.lng, lat: coordinate.lat })
						.addTo(map);
				}
			}
		}
	}
};
