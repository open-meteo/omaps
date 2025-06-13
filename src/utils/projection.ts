import { degreesToRadians, radiansToDegrees } from './math';
import type { Domain } from '../types';

export interface Projection {
	forward(latitude: number, longitude: number): [x: number, y: number];
	reverse(x: number, y: number): [latitude: number, longitude: number];
}

export class RotatedLatLonProjection implements Projection {
	θ: number;
	ϕ: number;
	constructor(projectionData: Domain['grid']['projection']) {
		if (projectionData) {
			const rotation = projectionData.rotation;
			this.θ = degreesToRadians(90 + rotation[0]);
			this.ϕ = degreesToRadians(rotation[1]);
		} else {
			this.θ = 0;
			this.ϕ = 0;
		}
	}

	forward(latitude: number, longitude: number): [x: number, y: number] {
		let lon = degreesToRadians(longitude);
		let lat = degreesToRadians(latitude);

		let x = Math.cos(lon) * Math.cos(lat);
		let y = Math.sin(lon) * Math.cos(lat);
		let z = Math.sin(lat);

		let x2 =
			Math.cos(this.θ) * Math.cos(this.ϕ) * x +
			Math.cos(this.θ) * Math.sin(this.ϕ) * y +
			Math.sin(this.θ) * z;
		let y2 = -Math.sin(this.ϕ) * x + Math.cos(this.ϕ) * y;
		let z2 =
			-Math.sin(this.θ) * Math.cos(this.ϕ) * x -
			Math.sin(this.θ) * Math.sin(this.ϕ) * y +
			Math.cos(this.θ) * z;

		return [radiansToDegrees(Math.atan2(y2, x2)), radiansToDegrees(Math.asin(z2))];
	}

	reverse(x: number, y: number): [latitude: number, longitude: number] {
		let lon = degreesToRadians(x);
		let lat = degreesToRadians(y);

		let θ = -1 * this.θ;
		let ϕ = -1 * this.ϕ;

		// quick solution without conversion in cartesian space
		let lat2 = Math.asin(
			Math.cos(θ) * Math.sin(lat) - Math.cos(lon) * Math.sin(θ) * Math.cos(lat)
		);
		let lon2 =
			Math.atan2(
				Math.sin(lon),
				Math.tan(lat) * Math.sin(θ) + Math.cos(lon) * Math.cos(θ)
			) - ϕ;
		return [radiansToDegrees(lat2), radiansToDegrees(lon2)];
	}
}

export class LambertConformalConicProjection implements Projection {
	ρ0;
	F;
	n;
	λ0;

	R = 6370.997; // Radius of the Earth
	constructor(projectionData: Domain['grid']['projection']) {
		if (projectionData) {
			const λ0_dec = projectionData.λ0;
			const ϕ0_dec = projectionData.ϕ0;
			const ϕ1_dec = projectionData.ϕ1;
			const ϕ2_dec = projectionData.ϕ2;
			const radius = projectionData.radius;
			this.λ0 = degreesToRadians(((λ0_dec + 180) % 360) - 180);
			let ϕ0 = degreesToRadians(ϕ0_dec);
			let ϕ1 = degreesToRadians(ϕ1_dec);
			let ϕ2 = degreesToRadians(ϕ2_dec);

			if (ϕ1 == ϕ2) {
				this.n = Math.sin(ϕ1);
			} else {
				this.n =
					Math.log(Math.cos(ϕ1) / Math.cos(ϕ2)) /
					Math.log(
						Math.tan(Math.PI / 4 + ϕ2 / 2) /
							Math.tan(Math.PI / 4 + ϕ1 / 2)
					);
			}
			this.F =
				(Math.cos(ϕ1) * Math.pow(Math.tan(Math.PI / 4 + ϕ1 / 2), this.n)) /
				this.n;
			this.ρ0 = this.F / Math.pow(Math.tan(Math.PI / 4 + ϕ0 / 2), this.n);

			if (radius) {
				this.R = radius;
			}
		}
	}

	forward(latitude: number, longitude: number): [x: number, y: number] {
		let ϕ = degreesToRadians(latitude);
		let λ = degreesToRadians(longitude);
		// If (λ - λ0) exceeds the range:±: 180°, 360° should be added or subtracted.
		let θ = this.n * (λ - this.λ0);

		let p = this.F / Math.pow(Math.tan(Math.PI / 4 + ϕ / 2), this.n);
		let x = this.R * p * Math.sin(θ);
		let y = this.R * (this.ρ0 - p * Math.cos(θ));
		return [x, y];
	}

	reverse(x: number, y: number): [latitude: number, longitude: number] {
		let x_scaled = x / this.R;
		let y_scaled = y / this.R;

		let θ =
			this.n >= 0
				? Math.atan2(x_scaled, this.ρ0 - y_scaled)
				: Math.atan2(-1 * x_scaled, y_scaled - this.ρ0);
		let ρ =
			(this.n > 0 ? 1 : -1) *
			Math.sqrt(Math.pow(x_scaled, 2) + Math.pow(this.ρ0 - y_scaled, 2));

		let ϕ_rad = 2 * Math.atan(Math.pow(this.F / ρ, 1 / this.n)) - Math.PI / 2;
		let λ_rad = this.λ0 + θ / this.n;

		let ϕ = radiansToDegrees(ϕ_rad);
		let λ = radiansToDegrees(λ_rad);

		return [ϕ, λ > 180 ? λ - 360 : λ];
	}
}

export class LambertAzimuthalEqualAreaProjection implements Projection {
	λ0;
	ϕ1;
	R = 6371229; // Radius of the Earth
	constructor(projectionData: Domain['grid']['projection']) {
		if (projectionData) {
			const λ0_dec = projectionData.λ0;
			const ϕ1_dec = projectionData.ϕ1;
			const radius = projectionData.radius;
			this.λ0 = degreesToRadians(λ0_dec);
			this.ϕ1 = degreesToRadians(ϕ1_dec);
			if (radius) {
				this.R = radius;
			}
		} else {
			this.λ0 = 0;
			this.ϕ1 = 0;
		}
	}

	forward(latitude: number, longitude: number): [x: number, y: number] {
		let λ = degreesToRadians(longitude);
		let ϕ = degreesToRadians(latitude);

		let k = Math.sqrt(
			2 /
				(1 +
					Math.sin(this.ϕ1) * Math.sin(ϕ) +
					Math.cos(this.ϕ1) * Math.cos(ϕ) * Math.cos(λ - this.λ0))
		);

		let x = this.R * k * Math.cos(ϕ) * Math.sin(λ - this.λ0);
		let y =
			this.R *
			k *
			(Math.cos(this.ϕ1) * Math.sin(ϕ) -
				Math.sin(this.ϕ1) * Math.cos(ϕ) * Math.cos(λ - this.λ0));

		return [x, y];
	}

	reverse(x: number, y: number): [latitude: number, longitude: number] {
		x = x / this.R;
		y = y / this.R;
		let p = Math.sqrt(x * x + y * y);
		let c = 2 * Math.asin(0.5 * p);
		let ϕ = Math.asin(
			Math.cos(c) * Math.sin(this.ϕ1) + (y * Math.sin(c) * Math.cos(this.ϕ1)) / p
		);
		let λ =
			this.λ0 +
			Math.atan(
				(x * Math.sin(c)) /
					(p * Math.cos(this.ϕ1) * Math.cos(c) -
						y * Math.sin(this.ϕ1) * Math.sin(c))
			);

		ϕ = radiansToDegrees(ϕ);
		λ = radiansToDegrees(λ);

		return [ϕ, λ];
	}
}

const projections = {
	RotatedLatLonProjection,
	LambertConformalConicProjection,
	LambertAzimuthalEqualAreaProjection
};

export class DynamicProjection {
	constructor(projName: string, opts: Domain['grid']['projection']) {
		return new projections[projName](opts);
	}
}

export class ProjectionGrid {
	projection;
	nx;
	ny;
	origin;
	dx; //meters
	dy; //meters

	constructor(
		projection: Projection,
		nx: number,
		ny: number,

		latitude: number | number[],
		longitude: number | number[],

		dx = 0,
		dy = 0,

		projectOrigin = true
	) {
		this.projection = projection;
		this.nx = nx;
		this.ny = ny;
		if (latitude && Array === latitude.constructor) {
			latitude as number[];
			longitude as number[];
			let sw = projection.forward(latitude[0], longitude[0]);
			let ne = projection.forward(latitude[1], longitude[1]);
			this.origin = sw;
			this.dx = (ne[0] - sw[0]) / (nx - 1);
			this.dy = (ne[1] - sw[1]) / (ny - 1);
		} else if (projectOrigin) {
			this.dx = dx;
			this.dy = dy;
			this.origin = this.projection.forward(
				latitude as number,
				longitude as number
			);
		} else {
			this.dx = dx;
			this.dy = dy;
			this.origin = [latitude as number, longitude as number];
		}
	}

	findPointInterpolated(lat: number, lon: number) {
		let [xpos, ypos] = this.projection.forward(lat, lon);
		let x = (xpos - this.origin[0]) / this.dx;
		let y = (ypos - this.origin[1]) / this.dy;
		let xFraction = x - Math.floor(x);
		let yFraction = y - Math.floor(y);
		if (y < 0 || x < 0 || y >= this.ny || x >= this.nx) {
			return null;
		}
		return { index: Math.floor(y) * this.nx + Math.floor(x), xFraction, yFraction };
	}
}
