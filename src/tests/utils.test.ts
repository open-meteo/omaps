import { expect, test } from 'vitest';
import { pad } from '../utils/pad';

// --- pad ---
test('check pad with 1 digit', () => {
	expect(pad(1)).toBe('01');
});
