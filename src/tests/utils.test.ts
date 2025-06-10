import { expect, test } from 'vitest';
import { pad } from '../utils/pad';
import { RotatedLatLonProjection, LambertConformalConicProjection } from '../utils/projection';

// --- pad ---
test('check pad with 1 digit', () => {
	expect(pad(1)).toBe('01');
});

test('Test LambertConformalConicProjection for DMI', () => {
	const proj = new LambertConformalConicProjection({
		λ0: 352,
		ϕ0: 55.5,
		ϕ1: 55.5,
		ϕ2: 55.5,
		radius: 6371229
	});
	expect(proj.ρ0).toBe(0.6872809586016131);
	expect(proj.F).toBe(1.801897704650192);
	expect(proj.n).toBe(0.8241261886220157);
	expect(proj.λ0).toBe(-0.13962634015954636);
	expect(proj.R).toBe(6371229);

	expect(proj.forward(39.671, -25.421997)[0]).toBe(-1527524.6244234492);
	expect(proj.forward(39.671, -25.421997)[1]).toBe(-1588681.0428292789);
});

test('Test RotatedLatLon for KNMI', () => {
	const proj = new RotatedLatLonProjection({
		rotation: [-35, -8]
	});
	expect(proj.θ).toBe(0.9599310885968813);
	expect(proj.ϕ).toBe(-0.13962634015954636);

	expect(proj.forward(39.671, -25.421997)[0]).toBe(-13.716985366241445);
	expect(proj.forward(39.671, -25.421997)[1]).toBe(-13.617348599940314);
});
