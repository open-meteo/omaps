import { degreesToRadians, radiansToDegrees } from './math';

export class Projection {
	ρ0;
	F;
	n;
	λ0;

	R; // Radius of the Earth

	constructor(
		λ0_dec: number,
		ϕ0_dec: number,
		ϕ1_dec: number,
		ϕ2_dec: number,
		radius = 6370.997
	) {
		this.λ0 = degreesToRadians((λ0_dec + 180) / 360 - Math.floor((λ0_dec + 180) / 360));

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
		this.F = (Math.cos(ϕ1) * Math.pow(Math.tan(Math.PI / 4 + ϕ1 / 2), this.n)) / this.n;
		this.ρ0 = this.F / Math.pow(Math.tan(Math.PI / 4 + ϕ0 / 2), this.n);
		this.R = radius;
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

export class ProjectionGrid {
	projection;
	nx;
	ny;
	origin;
	dx; //meters
	dy; //meters

	constructor(
		nx: number,
		ny: number,
		latitude: number,
		longitude: number,
		dx: number,
		dy: number,
		projection: Projection
	) {
		this.projection = projection;
		this.nx = nx;
		this.ny = ny;

		this.origin = this.projection.forward(latitude, longitude);

		this.dx = dx;
		this.dy = dy;
	}

	findPointInterpolated(lat: number, lon: number) {
		let [x, y] = this.projection.forward(lat, lon);
		if (y < 0 || x < 0 || y >= this.ny || x >= this.nx) {
			return null;
		}
		let xFraction = x / 1 - Math.floor(x / 1);
		let yFraction = y / 1 - Math.floor(y / 1);
		return { index: Math.floor(y) * this.nx + Math.floor(x), xFraction, yFraction };
	}
}
