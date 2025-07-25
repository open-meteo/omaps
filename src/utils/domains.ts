import { type Domain } from '../types';

import {
	getBorderPoints,
	getBoundsFromBorderPoints,
	getCenterFromBounds,
	getCenterFromGrid
} from './math';
import { DynamicProjection, ProjectionGrid, type Projection } from './projection';

export const domainGroups = [
	'bom',
	'dmi',
	'dwd',
	'ecmwf',
	'cmc_gem',
	'ncep',
	'italia_meteo',
	'jma',
	'kma',
	'knmi',
	'meteofrance',
	'metno',
	'meteoswiss',
	'ukmo'
];

const getCenterPoint = (grid: Domain['grid']) => {
	let center;
	if (grid.projection) {
		const projection = new DynamicProjection(
			grid.projection.name,
			grid.projection
		) as Projection;
		const projectionGrid = new ProjectionGrid(
			projection,
			grid.nx,
			grid.ny,
			grid.projection.latitude,
			grid.projection.longitude,
			grid.dx,
			grid.dy,
			grid.projection.projectOrigin
		);
		const borderPoints = getBorderPoints(projectionGrid);
		const bounds = getBoundsFromBorderPoints(borderPoints, projection);
		center = getCenterFromBounds(bounds);
	} else {
		center = getCenterFromGrid(grid);
	}

	if (center.lng < 0.2 && center.lat < 0.2) {
		return { lng: 0, lat: 0 };
	} else {
		return center;
	}
};

export const domains: Array<Domain> = [
	// BOM
	{
		value: 'bom_access_global',
		label: 'BOM Global',
		grid: {
			nx: 2048,
			ny: 1536,
			latMin: -89.941406,
			lonMin: -179.912109,
			dx: 360 / 2048,
			dy: 180 / 1536,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_40m',
			'wind_80m',
			'wind_120m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// DMI
	{
		value: 'dmi_harmonie_arome_europe',
		label: 'DMI Harmonie Arome Europe',
		grid: {
			nx: 1906,
			ny: 1606,
			latMin: 39.671,
			lonMin: -25.421997,
			dx: 2000,
			dy: 2000,
			zoom: 4,
			projection: {
				λ0: 352,
				ϕ0: 55.5,
				ϕ1: 55.5,
				ϕ2: 55.5,
				latitude: 39.671,
				longitude: -25.421997,
				radius: 6371229,
				name: 'LambertConformalConicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_150m',
			'temperature_200m',
			'temperature_250m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_50m',
			'wind_150m',
			'wind_250m',
			'wind_350m',
			'wind_450m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// DWD
	{
		value: 'dwd_icon',
		label: 'DWD ICON',
		grid: {
			nx: 2879,
			ny: 1441,
			latMin: -90,
			lonMin: -180,
			dx: 0.125,
			dy: 0.125,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'temperature_2m',
			'temperature_80m',
			'temperature_120m',
			'temperature_180m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_80m',
			'wind_120m',
			'wind_180m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'dwd_icon_eu',
		label: 'DWD ICON EU',
		grid: {
			nx: 1377,
			ny: 657,
			latMin: 29.5,
			lonMin: -23.5,
			dx: 0.0625,
			dy: 0.0625,
			zoom: 3.2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'temperature_2m',
			'temperature_80m',
			'temperature_120m',
			'temperature_180m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_80m',
			'wind_120m',
			'wind_180m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'dwd_icon_d2',
		label: 'DWD ICON D2',
		grid: {
			nx: 1215,
			ny: 746,
			latMin: 43.18,
			lonMin: -3.94,
			dx: 0.02,
			dy: 0.02,
			zoom: 5.2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'temperature_2m',
			'temperature_80m',
			'temperature_120m',
			'temperature_180m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_80m',
			'wind_120m',
			'wind_180m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},

	// GFS
	{
		value: 'ncep_gfs025',
		label: 'GFS Global 0.25°',
		grid: {
			nx: 1440,
			ny: 721,
			latMin: -90,
			lonMin: -180,
			dx: 0.25,
			dy: 0.25,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			//'cloud_cover', <- only per hPa
			'pressure_msl',
			//'relative_humidity_2m',  <- only per hPa
			'shortwave_radiation',
			'temperature_80m',
			'temperature_100m',
			'visibility',
			'weather_code',
			'wind_80m',
			'wind_100m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'ncep_gfs013',
		label: 'GFS Global 0.13°',
		grid: {
			nx: 3072,
			ny: 1536,
			latMin: (-0.11714935 * (1536 - 1)) / 2,
			lonMin: -180,
			dx: 360 / 3072,
			dy: 0.11714935,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'uv_index',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'ncep_hrrr_conus',
		label: 'GFS HRRR Conus',
		grid: {
			nx: 1799,
			ny: 1059,
			latMin: 21.138,
			lonMin: -122.72,
			dx: 0,
			dy: 0,
			zoom: 3.5,
			projection: {
				λ0: -97.5,
				ϕ0: 0,
				ϕ1: 38.5,
				ϕ2: 38.5,
				latitude: [21.138, 47.8424],
				longitude: [-122.72, -60.918],
				name: 'LambertConformalConicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'ncep_nbm_conus',
		label: 'GFS NBM Conus',
		grid: {
			nx: 2345,
			ny: 1597,
			latMin: 19.229,
			lonMin: 233.723 - 360,
			dx: 2539.7,
			dy: 2539.7,
			zoom: 3.5,
			projection: {
				λ0: 265 - 360,
				ϕ0: 0,
				ϕ1: 25,
				ϕ2: 25,
				radius: 6371200,
				latitude: 19.229,
				longitude: 233.723 - 360,
				name: 'LambertConformalConicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'thunderstorm_probability',
			'visibility',
			'wind_10m',
			'wind_80m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// ECWMF
	{
		value: 'ecmwf_ifs025',
		label: 'ECMWF IFS 0.25°',
		grid: {
			nx: 1440,
			ny: 721,
			latMin: -90,
			lonMin: -180,
			dx: 360 / 1440,
			dy: 180 / (721 - 1),
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_100m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'ecmwf_aifs025_single',
		label: 'ECMWF AIFS 0.25° Single ',
		grid: {
			nx: 1440,
			ny: 721,
			latMin: -90,
			lonMin: -180,
			dx: 360 / 1440,
			dy: 180 / (721 - 1),
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 6,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_100m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},

	// GEM
	{
		value: 'cmc_gem_gdps',
		label: 'GEM Global',
		grid: {
			nx: 2400,
			ny: 1201,
			latMin: -90,
			lonMin: -180,
			dx: 0.15,
			dy: 0.15,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 3,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_40m',
			'temperature_80m',
			'temperature_120m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_40m',
			'wind_80m',
			'wind_120m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},
	// {
	// 	value: 'cmc_gem_geps',
	// 	label: 'GEM Global',
	// 	grid: {
	// 		nx: 2400,
	// 		ny: 1201,
	// 		latMin: -90,
	// 		lonMin: -180,
	// 		dx: 0.15,
	// 		dy: 0.15,
	// 		zoom: 1,
	// 		center: function () {
	// 			this.center = getCenterPoint(this);
	// 			return this;
	// 		}
	// 	},
	// 	time_interval: 3,
	// 	variables: ['precipitation_probability'],
	// 	windUVComponents: false
	// },
	{
		value: 'cmc_gem_hrdps',
		label: 'GEM HRDPS Continental',
		grid: {
			nx: 2540,
			ny: 1290,
			latMin: 39.626034,
			lonMin: -133.62952,
			dx: 0.15,
			dy: 0.15,
			zoom: 1,
			projection: {
				rotation: [-36.0885, 245.305],
				latitude: [39.626034, 47.876457],
				longitude: [-133.62952, -40.708557],
				name: 'RotatedLatLonProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_40m',
			'temperature_80m',
			'temperature_120m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_40m',
			'wind_80m',
			'wind_120m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},
	{
		value: 'cmc_gem_rdps',
		label: 'GEM Regional',
		grid: {
			nx: 935,
			ny: 824,
			latMin: 18.14503,
			lonMin: 217.10745,
			dx: 0.15,
			dy: 0.15,
			zoom: 1,
			projection: {
				latitude: 90,
				longitude: 249,
				name: 'StereograpicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 3,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_40m',
			'wind_80m',
			'wind_120m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// ItaliaMeteo
	{
		value: 'italia_meteo_arpae_icon_2i',
		label: 'IM ARPAE ICON 2i',
		grid: {
			nx: 761,
			ny: 761,
			latMin: 33.7,
			lonMin: 3,
			dx: 0.025,
			dy: 0.02,
			zoom: 5.2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// JMA
	{
		value: 'jma_gsm',
		label: 'JMA GSM',
		grid: {
			nx: 720,
			ny: 361,
			latMin: -90,
			lonMin: -180,
			dx: 0.5,
			dy: 0.5,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'jma_msm',
		label: 'JMA MSM',
		grid: {
			nx: 481,
			ny: 505,
			latMin: 22.4,
			lonMin: 120,
			dx: 0.0625,
			dy: 0.05,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m'
		],
		windUVComponents: true
	},

	// MeteoFrance
	{
		value: 'meteofrance_arpege_world025',
		label: 'MF ARPEGE World',
		grid: {
			nx: 1440,
			ny: 721,
			latMin: -90,
			lonMin: -180,
			dx: 0.25,
			dy: 0.25,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_150m',
			'temperature_200m',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_150m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'meteofrance_arpege_europe',
		label: 'MF ARPEGE Europe',
		grid: {
			nx: 741,
			ny: 521,
			latMin: 20,
			lonMin: -32,
			dx: 0.1,
			dy: 0.1,
			zoom: 3.5,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_150m',
			'temperature_200m',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_150m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'meteofrance_arome_france0025',
		label: 'MF AROME France',
		grid: {
			nx: 1121,
			ny: 717,
			latMin: 37.5,
			lonMin: -12,
			dx: 0.025,
			dy: 0.025,
			zoom: 5.2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_150m',
			'temperature_200m',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_150m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},

	{
		value: 'meteofrance_arome_france_hd',
		label: 'MF AROME France HD',
		grid: {
			nx: 2801,
			ny: 1791,
			latMin: 37.5,
			lonMin: -12,
			dx: 0.01,
			dy: 0.01,
			zoom: 5.2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_20m',
			'wind_50m',
			'wind_100m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},

	// MetNo
	{
		value: 'metno_nordic_pp',
		label: 'MET Norway Nordic',
		grid: {
			nx: 1796,
			ny: 2321,
			latMin: 52.30272,
			lonMin: 1.9184653,
			dx: 0.25,
			dy: 0.25,
			zoom: 4,
			projection: {
				λ0: 15,
				ϕ0: 63,
				ϕ1: 63,
				ϕ2: 63,
				latitude: [52.30272, 72.18527],
				longitude: [1.9184653, 41.764282],
				name: 'LambertConformalConicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// KMA
	{
		value: 'kma_gdps',
		label: 'KMA GDPS 12km',
		grid: {
			nx: 2560,
			ny: 1920,
			latMin: -90 + 180 / 1920 / 2,
			lonMin: -180 + 360 / 2560 / 2,
			dx: 360 / 2560,
			dy: 180 / 1920,
			zoom: 2,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 3,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},
	{
		value: 'kma_ldps',
		label: 'KMA LDPS 1.5km',
		grid: {
			nx: 602,
			ny: 781,
			latMin: 32.2569,
			lonMin: 121.834,
			dx: 1500,
			dy: 1500,
			zoom: 5.5,
			projection: {
				λ0: 126,
				ϕ0: 38,
				ϕ1: 30,
				ϕ2: 60,
				radius: 6371229,
				latitude: 32.2569,
				longitude: 121.834,
				name: 'LambertConformalConicProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover_2m',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'visibility',
			'wind_10m',
			'wind_50m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// KNMI
	{
		value: 'knmi_harmonie_arome_europe',
		label: 'KNMI Harmonie Arome Europe',
		grid: {
			nx: 676,
			ny: 564,
			latMin: 39.740627,
			lonMin: -25.162262,
			dx: 0,
			dy: 0,
			zoom: 3.5,
			projection: {
				rotation: [-35, -8],
				latitude: [39.740627, 62.619324],
				longitude: [-25.162262, 38.75702],
				name: 'RotatedLatLonProjection'
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_200m',
			'visibility',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},
	{
		value: 'knmi_harmonie_arome_netherlands',
		label: 'KNMI Harmonie Arome Netherlands',
		grid: {
			nx: 390,
			ny: 390,
			latMin: 49,
			lonMin: 0,
			dx: 0.029,
			dy: 0.018,
			zoom: 6,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_200m',
			'visibility',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},

	// MeteoSwiss ICON
	{
		value: 'meteoswiss_icon_ch1',
		label: 'MeteoSwiss ICON CH1',
		grid: {
			nx: 1089,
			ny: 705,
			latMin: 43.18,
			lonMin: -3.94,
			dx: 0.01,
			dy: 0.01,
			zoom: 5.2,
			projection: {
				rotation: [43.0, 190.0],
				latitude: -6.46,
				longitude: -4.06,
				name: 'RotatedLatLonProjection',
				projectOrigin: false
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'sunshine_duration',
			'surface_temperature',
			'temperature_2m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},
	{
		value: 'meteoswiss_icon_ch2',
		label: 'MeteoSwiss ICON CH2',
		grid: {
			nx: 545,
			ny: 353,
			latMin: 43.18,
			lonMin: -3.94,
			dx: 0.02,
			dy: 0.02,
			zoom: 5.2,
			projection: {
				rotation: [43.0, 190.0],
				latitude: -6.46,
				longitude: -4.06,
				name: 'RotatedLatLonProjection',
				projectOrigin: false
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'pressure_msl',
			'relative_humidity_2m',
			'shortwave_radiation',
			'sunshine_duration',
			'surface_temperature',
			'temperature_2m',
			'visibility',
			'weather_code',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: true
	},

	// UKMO
	{
		value: 'ukmo_global_deterministic_10km',
		label: 'UK Met Office 10km',
		grid: {
			nx: 2560,
			ny: 1920,
			latMin: -90,
			lonMin: -180,
			dx: 360 / 2560,
			dy: 180 / 1920,
			zoom: 1,
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'wind_10m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	},
	{
		value: 'ukmo_uk_deterministic_2km',
		label: 'UK Met Office 2km',
		grid: {
			nx: 1042,
			ny: 970,
			latMin: 0, //-1036000
			lonMin: 0, //-1158000
			dx: 2000,
			dy: 2000,
			zoom: 4,
			projection: {
				λ0: -2.5,
				ϕ1: 54.9,
				latitude: -1036000,
				longitude: -1158000,
				radius: 6371229,
				name: 'LambertAzimuthalEqualAreaProjection',
				projectOrigin: false
			},
			center: function () {
				this.center = getCenterPoint(this);
				return this;
			}
		},
		time_interval: 1,
		variables: [
			'cape',
			'cloud_cover',
			'precipitation',
			'relative_humidity_2m',
			'shortwave_radiation',
			'temperature_2m',
			'temperature_50m',
			'temperature_100m',
			'temperature_150m',
			'temperature_200m',
			'temperature_250m',
			'visibility',
			'wind_10m',
			'wind_50m',
			'wind_100m',
			'wind_150m',
			'wind_200m',
			'wind_gusts_10m'
		],
		windUVComponents: false
	}
];

for (let domain of domains) {
	if (domain.grid.center && typeof domain.grid.center == 'function') {
		domain.grid.center();
	}
}
