import type { IconListPixels } from './icons';
const iconPixelData: IconListPixels = {};

for (let [i, map] of Object.entries({ 0: 'arrow' })) {
	iconPixelData[i] = `images/weather-icons/wi-direction-up2.svg`;
}

export default iconPixelData;
