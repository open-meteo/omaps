import { degreesToRadians, radiansToDegrees } from './math';

export class Projection {
	ρ0 = 0;
	F = 0;
	n = 0;
	λ0 = 0;

	R = 6370.997; // Radius of the Earth

	forward(latitude: number, longitude: number): [x: number, y: number] {
		return [latitude * 0, longitude * 0];
	}

	reverse(x: number, y: number): [latitude: number, longitude: number] {
		return [x * 0, y * 0];
	}
}

export class LambertConformalConicProjection extends Projection {
	constructor(
		λ0_dec: number,
		ϕ0_dec: number,
		ϕ1_dec: number,
		ϕ2_dec: number,
		radius = 6370.997
	) {
		super();
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
		this.F = (Math.cos(ϕ1) * Math.pow(Math.tan(Math.PI / 4 + ϕ1 / 2), this.n)) / this.n;
		this.ρ0 = this.F / Math.pow(Math.tan(Math.PI / 4 + ϕ0 / 2), this.n);

		if (radius) {
			this.R = radius;
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

const projections = {
	LambertConformalConicProjection
};

export class DynamicProjection {
	constructor(projName: string, opts: any[]) {
		return new projections[projName](...opts);
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
		if (Array === latitude.constructor) {
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
			this.origin = [latitude, longitude];
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
