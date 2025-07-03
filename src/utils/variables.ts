export const variables = [
	{ value: 'cape', label: 'CAPE' },

	{ value: 'cloud_cover', label: 'Cloud Cover' },

	{ value: 'precipitation', label: 'Precipitation' },
	{ value: 'pressure_msl', label: 'Pressure Main Sea Level' },

	{ value: 'relative_humidity_2m', label: 'Relative Humidity 2m' },

	{ value: 'shortwave_radiation', label: 'Shortwave Solar Radiation' },

	{ value: 'sunshine_duration', label: 'Sunshine Duration' },

	{ value: 'temperature_2m', label: 'Temperature 2m' },
	{ value: 'temperature_50m', label: 'Temperature 50m' },
	{ value: 'temperature_80m', label: 'Temperature 80m' },
	{ value: 'temperature_100m', label: 'Temperature 100m' },
	{ value: 'temperature_120m', label: 'Temperature 120m' },
	{ value: 'temperature_150m', label: 'Temperature 150m' },
	{ value: 'temperature_180m', label: 'Temperature 180m' },
	{ value: 'temperature_200m', label: 'Temperature 200m' },
	{ value: 'temperature_250m', label: 'Temperature 250m' },

	{ value: 'thunderstorm_probability', label: 'Thunderstorm probability' },

	{ value: 'uv_index', label: 'UV Index' },

	{ value: 'visibility', label: 'Visibility' },

	{ value: 'weather_code', label: 'Weather Codes' },

	{ value: 'wind_10m', label: 'Wind 10m' },
	{ value: 'wind_40m', label: 'Wind 40m' },
	{ value: 'wind_50m', label: 'Wind 50m' },
	{ value: 'wind_80m', label: 'Wind 80m' },
	{ value: 'wind_100m', label: 'Wind 100m' },
	{ value: 'wind_120m', label: 'Wind 120m' },
	{ value: 'wind_150m', label: 'Wind 150m' },
	{ value: 'wind_180m', label: 'Wind 180m' },
	{ value: 'wind_200m', label: 'Wind 200m' },

	{ value: 'wind_gusts_10m', label: 'Wind Gusts 10m' }
];

export const hideZero = ['precipitation', 'cloud_cover'];
export const requestMultiple = [
	'wind_10m',
	'wind_40m',
	'wind_50m',
	'wind_80m',
	'wind_100m',
	'wind_120m',
	'wind_150m',
	'wind_180m'
];

export const drawOnTiles = [
	'weather_code',
	'wind_10m',
	'wind_40m',
	'wind_50m',
	'wind_80m',
	'wind_100m',
	'wind_120m',
	'wind_150m',
	'wind_180m'
];
