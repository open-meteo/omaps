import { interpolateHsl, color } from 'd3';

export type ColorScaleParams = {
	customColors?: Array<HEXColor | string>;
	colorScheme?: string[];
	min: number;
	max: number;
	isReverse?: boolean;
	isContinuous?: boolean;
};

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
const colorScale = ({
	colorScheme = ['#009392', '#39b185', '#9ccb86', '#e9e29c', '#eeb479', '#e88471', '#cf597e'],
	customColors,
	min,
	max,
	isReverse = false
}: ColorScaleParams) => {
	let colors: Array<HEXColor | string>;

	if (colorScheme) {
		colors = [
			'#009392',
			'#39b185',
			'#9ccb86',
			'#e9e29c',
			'#eeb479',
			'#e88471',
			'#cf597e'
		];
	} else if (customColors && customColors.length >= 2) {
		colors = customColors;
	}

	let colorInts = interpolateColorScaleHSL(colors, max - min);
	const range = isReverse ? colorInts.reverse() : colorInts;

	return range;
};

export { colorScale, colorSchemeNames };

export const colorScales = {
	temperature: [
		...interpolateColorScaleHSL(['purple', 'blue'], 40), // -40° to 0°
		...interpolateColorScaleHSL(['blue', 'green'], 16), // 0° to 16°
		...interpolateColorScaleHSL(['green', 'orange'], 16), // 0° to 32°
		...interpolateColorScaleHSL(['orange', 'red'], 10), // 32° to 42°
		...interpolateColorScaleHSL(['red', 'purple'], 18) // 42° to 60°
	],
	precipitation: colorScale({
		min: -1,
		max: 15
	}),
	wind: colorScale({
		min: 0,
		max: 35
	})
};
