export const mapping = {
	0: 'clear',
	1: 'clear',
	2: 'cloudy',
	3: 'cloudy',
	4: 'fog',
	5: 'fog',
	10: 'fog',
	11: 'fog',
	12: 'lightning',
	18: 'strong-wind',
	20: 'fog',
	21: 'rain-mix',
	22: 'rain-mix',
	23: 'rain',
	24: 'snow',
	25: 'hail',
	26: 'thunderstorm',
	27: 'dust',
	28: 'dust',
	29: 'dust',
	30: 'fog',
	31: 'fog',
	32: 'fog',
	33: 'fog',
	34: 'fog',
	35: 'fog',
	40: 'rain-mix',
	41: 'sprinkle',
	42: 'rain',
	43: 'sprinkle',
	44: 'rain',
	45: 'hail',
	46: 'hail',
	47: 'snow',
	48: 'snow',
	50: 'sprinkle',
	51: 'sprinkle',
	52: 'rain',
	53: 'rain',
	54: 'snowflake-cold',
	55: 'snowflake-cold',
	56: 'snowflake-cold',
	57: 'sprinkle',
	58: 'rain',
	60: 'sprinkle',
	61: 'sprinkle',
	62: 'rain',
	63: 'rain',
	64: 'hail',
	65: 'hail',
	66: 'hail',
	67: 'rain-mix',
	68: 'rain-mix',
	70: 'snow',
	71: 'snow',
	72: 'snow',
	73: 'snow',
	74: 'snowflake-cold',
	75: 'snowflake-cold',
	76: 'snowflake-cold',
	77: 'snow',
	78: 'snowflake-cold',
	80: 'rain',
	81: 'sprinkle',
	82: 'rain',
	83: 'rain',
	84: 'storm-showers',
	85: 'rain-mix',
	86: 'rain-mix',
	87: 'rain-mix',
	89: 'hail',
	90: 'lightning',
	91: 'storm-showers',
	92: 'thunderstorm',
	93: 'thunderstorm',
	94: 'lightning',
	95: 'thunderstorm',
	96: 'thunderstorm',
	99: 'tornado'
};

export interface IconListPixels {
	[key: number]: Uint8ClampedArray;
}

const iconListPixels: IconListPixels = {};

for (let [i, map] of Object.entries(mapping)) {
	const response = await fetch(`images/weather-icons/wi-day-${map}.svg`);
	const svgString = await response.text();

	// make it base64
	const svg64 = btoa(svgString);
	const b64Start = 'data:image/svg+xml;base64,';

	// prepend a "header"
	const image64 = b64Start + svg64;
	const canvas = new OffscreenCanvas(64, 64);

	let img = new Image();
	img.onload = () => {
		// draw the image onto the canvas
		canvas.getContext('2d').drawImage(img, 0, 0);
		const iconData = canvas.getContext('2d').getImageData(0, 0, 64, 64);
		iconListPixels[i] = iconData.data;
	};
	img.src = image64;
}

export default iconListPixels;
