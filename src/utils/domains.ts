export const domainGroups = [
	'dwd',
	'italia_meteo',
	'meteofrance',
	'ecmwf',
	'ukmo',
	//'kma',
	'knmi',
	'cams'
];

export const domains = [
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
	},
	// MeteoFrance
	{
		value: 'meteofrance_arpege_world',
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
			zoom: 3.5,
			center: function () {
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
			zoom: 3.5,
			center: function () {
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
	},
	{
		value: 'ecmwf_ifs04',
		label: 'ECMWF IFS 0.4°',
		grid: {
			nx: 900,
			ny: 451,
			latMin: -90,
			lonMin: -180,
			dx: 360 / 900,
			dy: 180 / (451 - 1),
			zoom: 1,
			center: function () {
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
	},
	// Needs reprojection
	// {
	// 	value: 'ukmo_uk_deterministic_2km',
	// 	label: 'UK Met Office 2km',
	// 	grid: {
	// 		nx: 1042,
	// 		ny: 970,
	// 		latMin: -1036000,
	// 		lonMin: -1158000,
	// 		dx: 2000,
	// 		dy: 2000,
	// 		zoom: 1,
	//		projection: LambertAzimuthalEqualAreaProjection(λ0: -2.5, ϕ1: 54.9, radius: 6371229)
	// 	}
	// }

	// Not available in data_spatial
	// KMA
	// {
	// 	value: 'kma_gdps',
	// 	label: 'KMA GDPS 12km',
	// 	grid: {
	// 		nx: 2560,
	// 		ny: 1920,
	// 		latMin: -90 + 180 / 1920 / 2,
	// 		lonMin: -180 + 360 / 2560 / 2,
	// 		dx: 360 / 2560,
	// 		dy: 180 / 1920,
	// 		zoom: 1,
	// 		center: function () {
	// 			this.center = {
	// 				lng: this.lonMin + this.dx * (this.nx * 0.5),
	// 				lat: this.latMin + this.dy * (this.ny * 0.5)
	// 			};
	// 			return this;
	// 		}
	// 	}
	// },

	// KNMI
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
	},

	// CAMS
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
				this.center = {
					lng: this.lonMin + this.dx * (this.nx * 0.5),
					lat: this.latMin + this.dy * (this.ny * 0.5)
				};
				return this;
			}
		}
	}
];

for (let domain of domains) {
	domain.grid.center();
}
