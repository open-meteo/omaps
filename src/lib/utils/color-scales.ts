import { interpolateHsl, color } from 'd3';

function interpolateColorScaleHSL(colors: Array<string>, steps: number) {
	const segments = colors.length - 1;
	const stepsPerSegment = Math.floor(steps / segments);
	const remainder = steps % segments;

	const rgbArray = [];

	for (let i = 0; i < segments; i++) {
		const startColor = colors[i];
		const endColor = colors[i + 1];
		const interpolate = interpolateHsl(startColor, endColor);

		const numSteps = stepsPerSegment + (i < remainder ? 1 : 0);

		for (let j = 0; j < numSteps; j++) {
			const t = j / (numSteps - 1); // range [0, 1]
			let c = color(interpolate(t));
			if (c) {
				c = c.rgb();
				rgbArray.push([c.r, c.g, c.b]);
			}
		}
	}

	return rgbArray;
}

export const colorScales = {
	cape: [
		...interpolateColorScaleHSL(
			[
				'#009392',
				'#39b185',
				'#9ccb86',
				'#e9e29c',
				'#eeb479',
				'#e88471',
				'#cf597e'
			],
			4000
		)
	],
	cloud: [
		...interpolateColorScaleHSL(['#FFF', '#c3c2c2'], 100) // 0 to 100%
	],
	precipitation: [
		...interpolateColorScaleHSL(['blue', 'green'], 5), // 0 to 5mm
		...interpolateColorScaleHSL(['green', 'orange'], 5), // 5 to 10mm
		...interpolateColorScaleHSL(['orange', 'red'], 10) // 10 to 20mm
	],
	pressure: [
		...interpolateColorScaleHSL(['#4444FF', '#FFFFFF'], 25), // 950 to 1000hPa
		...interpolateColorScaleHSL(['#FFFFFF', '#FF4444'], 25) // 1000hPa to 1050hPa
	],
	relative: [
		...interpolateColorScaleHSL(
			[
				'#009392',
				'#39b185',
				'#9ccb86',
				'#e9e29c',
				'#eeb479',
				'#e88471',
				'#cf597e'
			].reverse(),
			100
		)
	],
	shortwave: [
		...interpolateColorScaleHSL(
			[
				'#009392',
				'#39b185',
				'#9ccb86',
				'#e9e29c',
				'#eeb479',
				'#e88471',
				'#cf597e'
			],
			1000
		)
	],
	temperature: [
		...interpolateColorScaleHSL(['purple', 'blue'], 40), // -40° to 0°
		...interpolateColorScaleHSL(['blue', 'green'], 16), // 0° to 16°
		...interpolateColorScaleHSL(['green', 'orange'], 12), // 0° to 28°
		...interpolateColorScaleHSL(['orange', 'red'], 14), // 28° to 42°
		...interpolateColorScaleHSL(['red', 'purple'], 18) // 42° to 60°
	],
	thunderstorm: [
		...interpolateColorScaleHSL(['blue', 'green'], 33), //
		...interpolateColorScaleHSL(['green', 'orange'], 33), //
		...interpolateColorScaleHSL(['orange', 'red'], 33) //
	],
	uv: [
		...interpolateColorScaleHSL(
			[
				'#009392',
				'#39b185',
				'#9ccb86',
				'#e9e29c',
				'#eeb479',
				'#e88471',
				'#cf597e'
			],
			11
		)
	],
	wind: [
		...interpolateColorScaleHSL(['blue', 'green'], 10), // 0 to 10kn
		...interpolateColorScaleHSL(['green', 'orange'], 10), // 10 to 20kn
		...interpolateColorScaleHSL(['orange', 'red'], 20) // 20 to 40kn
	]
};
