import { interpolateHsl, color } from 'd3';

export type HEXColor = `#${string}`;

export const COLOR_SCHEMES = {
	CartoTemps: ['#009392', '#39b185', '#9ccb86', '#e9e29c', '#eeb479', '#e88471', '#cf597e']
} satisfies { [key: string]: Array<HEXColor> };

const colorSchemeNames = Object.keys(COLOR_SCHEMES) as Array<keyof typeof COLOR_SCHEMES>;

function isValidColorSchemeName(name: string): name is keyof typeof COLOR_SCHEMES {
	return (colorSchemeNames as readonly string[]).includes(name);
}

export type ColorScaleParams = {
	customColors?: Array<HEXColor>;
	colorScheme?: string;
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
	colorScheme = 'CartoTemps',
	customColors,
	min,
	max,
	isReverse = false
}: ColorScaleParams) => {
	let colors: Array<HEXColor>;

	if (colorScheme) {
		if (isValidColorSchemeName(colorScheme)) {
			colors = COLOR_SCHEMES[colorScheme];
		} else {
			throw new Error(`"${colorScheme}" is not a supported color scheme`);
		}
	} else if (customColors && customColors.length >= 2) {
		colors = customColors;
	} else {
		throw new Error(
			`You must provide a colorScheme or an array of at least 2 customColors`
		);
	}

	let colorInts = interpolateColorScaleHSL(colors, max - min);
	const range = isReverse ? colorInts.reverse() : colorInts;

	return range;
};

export { colorScale, colorSchemeNames };
