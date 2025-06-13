import type { IconListPixels } from './icons';
const iconPixelData: IconListPixels = {};

for (let [i, map] of Object.entries({ 0: 'arrow' })) {
	const response = await fetch(`images/weather-icons/wi-direction-up2.svg`);
	const svgString = await response.text();

	// make it base64
	const svg64 = btoa(svgString);
	const b64Start = 'data:image/svg+xml;base64,';

	// prepend a "header"
	const image64 = b64Start + svg64;
	const canvas = new OffscreenCanvas(32, 32);

	let img = new Image();
	img.onload = () => {
		// draw the image onto the canvas
		canvas.getContext('2d').drawImage(img, 0, 0);
		const iconData = canvas.getContext('2d').getImageData(0, 0, 32, 32);
		iconPixelData[i] = iconData.data;
	};
	img.src = image64;
}

export default iconPixelData;
