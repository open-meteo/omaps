<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { pushState } from '$app/navigation';

	import { setMode, mode } from 'mode-watcher';

	import { toast } from 'svelte-sonner';

	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import { omProtocol, getValueFromLatLong } from '../om-protocol';
	import { pad } from '$lib/utils/pad';
	import { domainGroups, domains } from '$lib/utils/domains';
	import { hideZero, variables } from '$lib/utils/variables';

	import type { Variable, Domain } from '../types';

	import { Button } from '$lib/components/ui/button';

	import * as Sheet from '$lib/components/ui/sheet';
	import * as Select from '$lib/components/ui/select';
	import * as Drawer from '$lib/components/ui/drawer';

	let partial = $state(false);
	let sheetOpen = $state(false);
	let drawerOpen = $state(false);

	import '../styles.css';

	let darkMode = $derived(mode.current);

	class SettingsButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
			div.innerHTML = `<button style="display:flex;justify-content:center;align-items:center;">
				<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>`;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				sheetOpen = !sheetOpen;
			});

			return div;
		}
		onRemove() {}
	}
	class VariableButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
			div.innerHTML = `<button style="display:flex;justify-content:center;align-items:center;">
				<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" stroke-width="1.2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"  stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-images-icon lucide-images"><path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/></svg>
        </button>`;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				drawerOpen = !drawerOpen;
			});

			return div;
		}
		onRemove() {}
	}
	class DarkModeButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'maplibregl-ctrl maplibregl-ctrl-group';

			const darkSVG = `<button style="display:flex;justify-content:center;align-items:center;">
		<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" stroke-width="1.2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
             </button>`;

			const lightSVG = `<button style="display:flex;justify-content:center;align-items:center;">
		<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" stroke-width="1.2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-icon lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>`;
			div.innerHTML = mode.current !== 'dark' ? lightSVG : darkSVG;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				if (mode.current === 'light') {
					setMode('dark');
				} else {
					setMode('light');
				}
				div.innerHTML = mode.current !== 'dark' ? lightSVG : darkSVG;
				map.setStyle(
					`https://maptiler.servert.nl/styles/basic-world-maps${mode.current === 'dark' ? '-dark' : ''}/style.json`
				);
				setTimeout(() => changeOMfileURL(), 500);
			});
			return div;
		}
		onRemove() {}
	}

	class PartialButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'maplibregl-ctrl maplibregl-ctrl-group';

			const partialSVG = `<button style="display:flex;justify-content:center;align-items:center;">
				<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" stroke-width="1.2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database-zap-icon lucide-database-zap"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 15 21.84"/><path d="M21 5V8"/><path d="M21 12L18 17H22L19 22"/><path d="M3 12A9 3 0 0 0 14.59 14.87"/></svg>
             </button>`;

			const fullSVG = `<button style="display:flex;justify-content:center;align-items:center;">
				<svg xmlns="http://www.w3.org/2000/svg" opacity="0.75" stroke-width="1.2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database-icon lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
        </button>`;
			div.innerHTML = partial ? partialSVG : fullSVG;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				partial = !partial;
				div.innerHTML = partial ? partialSVG : fullSVG;
				url.searchParams.set('partial', String(partial));
				pushState(url + map._hash.getHashString(), {});
				setTimeout(() => changeOMfileURL(), 500);
			});
			return div;
		}
		onRemove() {}
	}

	let map: maplibregl.Map;
	let mapContainer: HTMLElement | null;

	let omUrl: string;
	let popup: maplibregl.Popup | undefined;

	let url: URL;
	let params: URLSearchParams;

	let domain: Domain = $state({ value: 'meteoswiss_icon_ch1', label: 'DWD ICON D2' });
	let variable: Variable = $state({ value: 'temperature_2m', label: 'Temperature 2m' });
	let timeSelected = $state(new Date());
	let modelRunSelected = $state(new Date());
	let mapBounds: maplibregl.LngLatBounds = $state();

	const TILE_SIZE = Number(import.meta.env.VITE_TILE_SIZE);

	let source: maplibregl.Map;

	let checkSourceLoadedInterval: ReturnType<typeof setInterval>;
	let checked = 0;
	const changeOMfileURL = () => {
		if (popup) {
			popup.remove();
		}

		if (!domain.variables.includes(variable.value)) {
			variable = variables.find((v) => v.value === domain.variables[0]) as Variable;
		}

		mapBounds = map.getBounds();

		omUrl = getOMUrl();
		if (map.getLayer('omFileLayer')) {
			map.removeLayer('omFileLayer');
		}
		if (map.getSource('omFileSource')) {
			map.removeSource('omFileSource');
		}

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
			'landuse_overlay_national_park'
		);
		checkSourceLoadedInterval = setInterval(() => {
			checked++;
			if (source.loaded() || checked >= 30) {
				checked = 0;
				clearInterval(checkSourceLoadedInterval);
			}
		}, 100);
	};

	let latest = $state();
	let progress = $state();

	onMount(() => {
		url = new URL(document.location.href);
		params = new URLSearchParams(url.search);

		if (params.get('domain')) {
			domain = domains.find((dm) => dm.value === params.get('domain')) ?? domains[0];
		} else {
			domain = domains.find((dm) => dm.value === import.meta.env.VITE_DOMAIN) ?? domains[0];
		}

		let urlModelTime = params.get('model_time');
		if (urlModelTime && urlModelTime.length == 15) {
			const year = parseInt(urlModelTime.slice(0, 4));
			const month = parseInt(urlModelTime.slice(5, 7)) - 1; // zero-based
			const day = parseInt(urlModelTime.slice(8, 10));
			const hour = parseInt(urlModelTime.slice(11, 13));
			const minute = parseInt(urlModelTime.slice(13, 15));
			// Parse Date from UTC components (urlTime is in UTC)
			modelRunSelected = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
		} else {
			modelRunSelected.setHours(0, 0, 0, 0); // Default to 12:00 local time
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

		if (params.get('variable')) {
			variable = variables.find((v) => v.value === params.get('variable')) ?? variables[0];
		} else {
			variable = variables.find((v) => v.value === import.meta.env.VITE_VARIABLE) ?? variables[0];
		}

		if (params.get('partial')) {
			partial = params.get('partial') === 'true';
		}
	});

	let showPopup = false;
	onMount(() => {
		maplibregl.addProtocol('om', omProtocol);

		map = new maplibregl.Map({
			container: mapContainer as HTMLElement,
			style: `https://maptiler.servert.nl/styles/basic-world-maps${mode.current === 'dark' ? '-dark' : ''}/style.json`,
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
			mapBounds = map.getBounds();
			// map.setSky({
			// 	'sky-color': '#000000',
			// 	'sky-horizon-blend': 0.8,
			// 	'horizon-color': '#80C1FF',
			// 	'horizon-fog-blend': 0.6,
			// 	'fog-color': '#D6EAFF',
			// 	'fog-ground-blend': 0
			// });

			// map.addSource('terrainSource', {
			// 	type: 'raster-dem',
			// 	tiles: ['https://mbtiles.servert.nl/services/copernicus-30m-terrain/tiles/{z}/{x}/{y}.png'],
			// 	tileSize: 256,
			// 	maxzoom: 16
			// });

			// map.addSource('hillshadeSource', {
			// 	type: 'raster-dem',
			// 	tiles: ['https://mbtiles.servert.nl/services/copernicus-30m-terrain/tiles/{z}/{x}/{y}.png'],
			// 	tileSize: 256,
			// 	maxzoom: 16
			// });

			// map.addLayer(
			// 	{
			// 		source: 'hillshadeSource',
			// 		id: 'hillshadeLayer',
			// 		type: 'hillshade',
			// 		paint: {
			// 			'hillshade-method': 'igor',
			// 			//'hillshade-exaggeration': 1,
			// 			'hillshade-shadow-color': 'rgba(0,0,0,0.35)',
			// 			'hillshade-highlight-color': 'rgba(255,255,255,0.35)'
			// 		}
			// 	},
			// 	'landuse_overlay_national_park'
			// );

			// map.addControl(
			// 	new maplibregl.TerrainControl({
			// 		source: 'terrainSource',
			// 		exaggeration: 1
			// 	})
			// );

			map.addControl(new SettingsButton());
			map.addControl(new VariableButton());
			map.addControl(new DarkModeButton());
			map.addControl(new PartialButton());

			latest = await getDomainData();
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
				'landuse_overlay_national_park'
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
		});
	});
	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});

	const getDomainData = async (latest = true) => {
		return new Promise((resolve) => {
			fetch(
				`https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${latest ? 'latest' : 'progress'}.json`
			).then(async (result) => {
				const json = await result.json();
				const referenceTime = json.reference_time;
				modelRunSelected = new Date(referenceTime);

				if (modelRunSelected - timeSelected > 0) {
					timeSelected = new Date(referenceTime);
				}

				resolve(json);
			});
		});
	};

	let latestRequest = $derived(getDomainData());

	const getOMUrl = () => {
		return `https://openmeteo.s3.amazonaws.com/data_spatial/${domain.value}/${modelRunSelected.getUTCFullYear()}/${pad(modelRunSelected.getUTCMonth() + 1)}/${pad(modelRunSelected.getUTCDate())}/${pad(modelRunSelected.getUTCHours())}00Z/${timeSelected.getUTCFullYear()}-${pad(timeSelected.getUTCMonth() + 1)}-${pad(timeSelected.getUTCDate())}T${pad(timeSelected.getUTCHours())}00.om?dark=${darkMode}&variable=${variable.value}&bounds=${mapBounds.getSouth()},${mapBounds.getWest()},${mapBounds.getNorth()},${mapBounds.getEast()}&partial=${partial}`;
	};

	const timeValid = $derived.by(async () => {
		let latest = await latestRequest;
		for (let vt of latest.valid_times) {
			let d = new Date(vt);
			if (timeSelected - d == 0) {
				return true;
			}
		}
		return false;
	});

	let selectedDomain = $derived(domain.value);
</script>

<div class="map" id="#map_container" bind:this={mapContainer}></div>

<div class="absolute">
	<Sheet.Root bind:open={sheetOpen}>
		<Sheet.Content><div class="px-6 pt-12">Units</div></Sheet.Content>
	</Sheet.Root>

	<Drawer.Root bind:open={drawerOpen}>
		<Drawer.Content class=" h-1/2 ">
			<div class="flex flex-col items-center overflow-y-scroll">
				<div class="container mx-auto px-3">
					<div class="mt-3 flex w-full flex-col flex-wrap gap-6 sm:flex-row sm:gap-0">
						<div class="flex flex-col gap-3 sm:w-1/2 md:w-1/4 md:pr-3">
							<h2 class="text-lg font-bold">Domains</h2>
							<div class="relative">
								<Select.Root
									name="domains"
									type="single"
									bind:value={selectedDomain}
									onValueChange={(value) => {
										domain = domains.find((dm) => dm.value === value) ?? domains[0];
										url.searchParams.set('domain', value);
										pushState(url + map._hash.getHashString(), {});
										toast('Domain set to: ' + domain.label);
									}}
								>
									<Select.Trigger
										aria-label="Domain trigger"
										class="top-[0.35rem] !h-12 w-full  pt-6 ">{domain?.label}</Select.Trigger
									>
									<Select.Content side="bottom">
										{#each domainGroups as { value: group, label: groupLabel } (group)}
											<Select.Group>
												<Select.GroupHeading>{groupLabel}</Select.GroupHeading>
												{#each domains as { value, label } (value)}
													{#if value.startsWith(group)}
														<Select.Item {value}>{label}</Select.Item>
													{/if}
												{/each}
											</Select.Group>
										{/each}
									</Select.Content>
									<Select.Label class="absolute top-0 left-2 z-10 px-1 text-xs">Domain</Select.Label
									>
								</Select.Root>
							</div>
						</div>

						{#await latestRequest}
							<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:px-3">
								<h2 class="mb-2 text-lg font-bold">Model runs</h2>
								Loading latest model runs...
							</div>
							<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:px-3">
								<h2 class="mb-2 text-lg font-bold">Valid times</h2>
								Loading latest valid times...
							</div>
							<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:pl-3">
								<h2 class="mb-2 text-lg font-bold">Variables</h2>
								Loading domain variables...
							</div>
						{:then latest}
							<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:px-3">
								<h2 class="mb-2 text-lg font-bold">Model runs</h2>
								{#each [modelRunSelected] as vt, i (i)}
									{@const d = new Date(vt)}
									<Button
										class="cursor-pointer bg-blue-200 hover:bg-blue-600 {d.getTime() ===
										modelRunSelected.getTime()
											? 'bg-blue-400'
											: ''}"
										onclick={() => {
											toast(
												'Model run set to: ' +
													d.getUTCFullYear() +
													'-' +
													pad(d.getUTCMonth() + 1) +
													'-' +
													d.getUTCDate() +
													' ' +
													d.getUTCHours() +
													':' +
													pad(d.getUTCMinutes())
											);
										}}
										>{d.getUTCFullYear() +
											'-' +
											pad(d.getUTCMonth() + 1) +
											'-' +
											d.getUTCDate() +
											' ' +
											d.getUTCHours() +
											':' +
											pad(d.getUTCMinutes())}</Button
									>
								{/each}
							</div>
							<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:px-3">
								<h2 class="mb-2 text-lg font-bold">Valid times</h2>
								{#each latest.valid_times as vt, i (i)}
									{@const d = new Date(vt)}
									<Button
										class="cursor-pointer bg-blue-200 hover:bg-blue-600 {d.getTime() ===
										timeSelected.getTime()
											? 'bg-blue-400'
											: ''}"
										onclick={() => {
											timeSelected = d;
											url.searchParams.set(
												'time',
												d.toISOString().replace(/[:Z]/g, '').slice(0, 15)
											);
											pushState(url + map._hash.getHashString(), {});
											changeOMfileURL();
										}}
										>{d.getUTCFullYear() +
											'-' +
											pad(d.getUTCMonth() + 1) +
											'-' +
											d.getUTCDate() +
											' ' +
											d.getUTCHours() +
											':' +
											pad(d.getUTCMinutes())}</Button
									>
								{/each}
							</div>
							{#if timeValid}
								<div class="flex flex-col gap-1 sm:w-1/2 md:w-1/4 md:pl-3">
									<h2 class="mb-2 text-lg font-bold">Variables</h2>

									{#each latest.variables as vr, i (i)}
										{#if !vr.startsWith('wind_') || vr === 'wind_gusts_10m'}
											{@const vrb = variables.find((v) => v.value === vr)}

											<Button
												class="cursor-pointer bg-blue-200 hover:bg-blue-600 {variable.value === vr
													? 'bg-blue-400'
													: ''}"
												onclick={() => {
													variable = vrb ?? variables[0];
													url.searchParams.set('variable', vr);
													pushState(url + map._hash.getHashString(), {});
													changeOMfileURL();
												}}>{vrb ? vrb.label : vr}</Button
											>
										{/if}
									{/each}
								</div>
							{:else}
								<div class="flex min-w-1/4 flex-col gap-1">No valid time selected</div>
							{/if}
						{/await}
					</div>
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>
</div>
