<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import { omProtocol, getValueFromLatLong } from '../om-protocol';
	import { pad } from '$lib/utils/pad';
	import { domains, domainGroups, getDomainOptions } from '$lib/utils/domains';
	import { hideZero, variables, getVariableOptions } from '$lib/utils/variables';
	import { createTimeSlider } from '$lib/components/time-slider';

	import type { Variable, Domain } from '../types';

	import '../styles.css';

	let map: maplibregl.Map;
	let mapContainer: HTMLElement | null;

	let omUrl: string;
	let infoBox: HTMLElement | null;
	let popup: maplibregl.Popup | undefined;

	let domain: Domain = $state({ value: 'meteoswiss_icon_ch1', label: 'DWD ICON D2' });
	let variable: Variable = $state({ value: 'temperature_2m', label: 'Temperature 2m' });
	let darkMode = $state();
	let timeSelected = $state(new Date());

	const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

	const getOMUrl = () => {
		//return `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${timeSelected.getUTCFullYear()}/${pad(timeSelected.getUTCMonth() + 1)}/${pad(timeSelected.getUTCDate())}/${pad(Math.ceil(timeSelected.getUTCHours()))}00Z/${'2025-07-25T0600'}.om?dark=${darkMode}&variable=${variable.value}`;
		return `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/2025/07/25/0600Z/${'2025-07-25T0600'}.om?dark=${darkMode}&variable=${variable.value}`;
	};

	let source: maplibregl.Map;
	let domainSelector: HTMLSelectElement, variableSelector: HTMLSelectElement;

	let timeSliderApi: { setDisabled: (d: boolean) => void };

	let checkSourceLoadedInterval: ReturnType<typeof setInterval>;
	let checked = 0;
	const changeOMfileURL = () => {
		variableSelector.replaceChildren('');
		variableSelector.innerHTML = `${getVariableOptions(domain, variable)}`;

		if (popup) {
			popup.remove();
		}

		if (!domain.variables.includes(variable.value)) {
			variable = variables.find((v) => v.value === domain.variables[0]) as Variable;
		}

		omUrl = getOMUrl();
		map.removeLayer('omFileLayer');
		map.removeSource('omFileSource');

		domainSelector.disabled = true;
		variableSelector.disabled = true;
		timeSliderApi.setDisabled(true);

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
				timeSliderApi.setDisabled(false);
				checked = 0;
				clearInterval(checkSourceLoadedInterval);
			}
		}, 100);
	};

	let showPopup = false;
	onMount(() => {
		let url = new URL(document.location.href);
		let params = new URLSearchParams(url.search);

		let darkMode = false;
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			darkMode = true;
		}
		if (params.get('dark')) {
			darkMode = params.get('dark') === 'true';
		}
		if (darkMode) {
			document.body.classList.add('dark');
		}

		if (params.get('domain')) {
			domain = domains.find((dm) => dm.value === params.get('domain')) ?? domains[0];
		} else {
			domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
		}

		let urlTime = params.get('time');
		if (urlTime && urlTime.length == 15) {
			const year = parseInt(urlTime.slice(0, 4));
			const month = parseInt(urlTime.slice(5, 7)) - 1; // zero-based
			const day = parseInt(urlTime.slice(8, 10));
			const hour = parseInt(urlTime.slice(11, 13));
			const minute = parseInt(urlTime.slice(13, 15));
			// Parse Date from UTC components (urlTime is in UTC)
			timeSelected = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
		} else {
			timeSelected.setHours(12, 0, 0, 0); // Default to 12:00 local time
		}

		let variable: Variable;
		if (params.get('variable')) {
			variable = variables.find((v) => v.value === params.get('variable')) ?? variables[0];
		} else {
			variable = variables.find((v) => v.value === import.meta.env.VITE_VARIABLE) ?? variables[0];
		}

		infoBox = document.getElementById('info_box');

		maplibregl.addProtocol('om', omProtocol);

		map = new maplibregl.Map({
			container: mapContainer as HTMLElement,
			style: `https://maptiler.servert.nl/styles/basic-world-maps${darkMode ? '-dark' : ''}/style.json`,
			center: typeof domain.grid.center == 'object' ? domain.grid.center : [0, 0],
			zoom: domain?.grid.zoom,
			keyboard: false,
			hash: true,
			maxZoom: 20,
			maxPitch: 85
		});

		map.touchZoomRotate.disableRotation();

		// Add zoom and rotation controls to the map.
		map.addControl(
			new maplibregl.NavigationControl({
				visualizePitch: true,
				showZoom: true,
				showCompass: true
			})
		);

		// Add geolocate control to the map.
		map.addControl(
			new maplibregl.GeolocateControl({
				fitBoundsOptions: {
					maxZoom: 13.5
				},
				positionOptions: {
					enableHighAccuracy: true
				},
				trackUserLocation: true
			})
		);

		map.addControl(new maplibregl.GlobeControl());

		// improved scrolling
		map.scrollZoom.setZoomRate(1 / 90);
		map.scrollZoom.setWheelZoomRate(1 / 90);

		map.on('load', async () => {
			map.setSky({
				'sky-color': '#000000',
				'sky-horizon-blend': 0.8,
				'horizon-color': '#80C1FF',
				'horizon-fog-blend': 0.6,
				'fog-color': '#D6EAFF',
				'fog-ground-blend': 0
			});

			map.addSource('terrainSource', {
				type: 'raster-dem',
				tiles: ['https://mbtiles.servert.nl/services/copernicus-30m-terrain/tiles/{z}/{x}/{y}.png'],
				tileSize: 256,
				maxzoom: 16
			});

			map.addSource('hillshadeSource', {
				type: 'raster-dem',
				tiles: ['https://mbtiles.servert.nl/services/copernicus-30m-terrain/tiles/{z}/{x}/{y}.png'],
				tileSize: 256,
				maxzoom: 16
			});

			map.addLayer(
				{
					source: 'hillshadeSource',
					id: 'hillshadeLayer',
					type: 'hillshade',
					paint: {
						'hillshade-method': 'igor',
						//'hillshade-exaggeration': 1,
						'hillshade-shadow-color': 'rgba(0,0,0,0.35)',
						'hillshade-highlight-color': 'rgba(255,255,255,0.35)'
					}
				},
				'road_area_pier'
			);

			map.addControl(
				new maplibregl.TerrainControl({
					source: 'terrainSource',
					exaggeration: 1
				})
			);

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

			map.on('mousemove', function (e) {
				if (showPopup) {
					const coordinates = e.lngLat;
					if (!popup) {
						popup = new maplibregl.Popup()
							.setLngLat(coordinates)
							.setHTML(`<span style="color:black;">Outside domain</span>`)
							.addTo(map);
					} else {
						popup.addTo(map);
					}
					let { index, value } = getValueFromLatLong(coordinates.lat, coordinates.lng);
					if (index) {
						if ((hideZero.includes(variable.value) && value <= 0.25) || !value) {
							popup.remove();
						} else {
							let string = '';
							if (variable.value.startsWith('wind_')) {
								string = `${value.toFixed(0)}kn`;
							} else {
								string = value.toFixed(1) + (variable.value.startsWith('temperature') ? 'C°' : '');
							}

							popup.setLngLat(coordinates).setHTML(`<span style="color:black;">${string}</span>`);
						}
					} else {
						popup
							.setLngLat(coordinates)
							.setHTML(`<span style="color:black;">Outside domain</span>`);
					}
				}
			});

			map.on('click', (e) => {
				showPopup = !showPopup;
				if (!showPopup && popup) {
					popup.remove();
				}
				if (showPopup && popup) {
					const coordinates = e.lngLat;
					popup.setLngLat(coordinates).addTo(map);
				}
			});

			if (infoBox) {
				infoBox.innerHTML = `
		 			<div>
						Selected domain:
						<select id="domain_selection" class="domain-selection" name="domains" value="${domain.value}">
		 					${getDomainOptions(domain.value)}
						</select>
						<br>
						Selected variable:
						<select id="variable_selection" class="variable-selection" name="variables" value="${variable.value}">
		 					${getVariableOptions(domain, variable)}
						</select>
						<br>
						Selected time:
						<div id="time_slider_container"></div>
		    				<div id="darkmode_toggle">${darkMode ? 'Light mode' : 'Dark mode'}</div>
		 			</div>
				`;

				const timeSliderContainer = document.getElementById('time_slider_container') as HTMLElement;
				timeSliderApi = createTimeSlider({
					container: timeSliderContainer,
					initialDate: timeSelected,
					onChange: (newDate) => {
						timeSelected = newDate;
						url.searchParams.set('time', newDate.toISOString().replace(/[:Z]/g, '').slice(0, 15));
						history.pushState({}, '', url);
						changeOMfileURL();
					}
				});

				domainSelector = document.querySelector('#domain_selection') as HTMLSelectElement;
				domainSelector?.addEventListener('change', (e) => {
					const target = e.target as HTMLSelectElement;
					if (target) {
						domain = domains.find((dm) => dm.value === target.value) ?? domains[0];

						url.searchParams.set('domain', target.value);
						history.pushState({}, '', url);
						changeOMfileURL();
					}
				});

				variableSelector = document.querySelector('#variable_selection') as HTMLSelectElement;
				variableSelector?.addEventListener('change', (e) => {
					const target = e.target as HTMLSelectElement;
					if (target) {
						variable = variables.find((v) => v.value === target.value) ?? variables[0];
						url.searchParams.set('variable', target.value);
						history.pushState({}, '', url);
						changeOMfileURL();
					}
				});

				const darkmodeToggle = document.getElementById('darkmode_toggle') as HTMLElement;
				darkmodeToggle?.addEventListener('click', (e) => {
					darkMode = !darkMode;
					url.searchParams.set('dark', String(darkMode));
					history.pushState({}, '', url);
					window.location.reload();
				});
			}
		});
	});
	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<div class="map" id="#map_container" bind:this={mapContainer}></div>
<div class="info-wrapper"><div id="info_box"></div></div>
