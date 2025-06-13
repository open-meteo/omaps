export const variables = [
	{ value: 'cape', label: 'CAPE' },

	{ value: 'cloud_cover', label: 'Cloud Cover' },

	{ value: 'precipitation', label: 'Precipitation' },
	{ value: 'pressure_msl', label: 'Pressure Main Sea Level' },

	{ value: 'relative_humidity_2m', label: 'Relative Humidity 2m' },

	{ value: 'shortwave_radiation', label: 'Shortwave Solar Radiation' },

	{ value: 'temperature_2m', label: 'Temperature 2m' },
	{ value: 'temperature_120m', label: 'Temperature 120m' },

	{ value: 'visibility', label: 'Visibility' },

	{ value: 'wind_10m', label: 'Wind 10m' },
	{ value: 'wind_40m', label: 'Wind 40m' },
	{ value: 'wind_80m', label: 'Wind 80m' },
	{ value: 'wind_120m', label: 'Wind 120m' },
	{ value: 'wind_gusts_10m', label: 'Wind Gusts 10m' }
];

export const hideZero = ['precipitation', 'cloud_cover'];
export const requestMultiple = ['wind_10m', 'wind_40m', 'wind_80m', 'wind_120m'];
