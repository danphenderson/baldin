import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_API_URL', import.meta.env.VITE_API_URL || 'https://api.test');

const emptyClientRectList = {
	length: 0,
	item: () => null,
	[Symbol.iterator]: function* iterator() {
		return undefined;
	},
} as unknown as DOMRectList;

function createZeroRect(): DOMRect {
	if (typeof DOMRect === 'function') {
		return new DOMRect(0, 0, 0, 0);
	}

	return {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		toJSON: () => ({}),
	} as DOMRect;
}

function installRectPolyfill(target: object | undefined): void {
	if (!target) return;

	if (!('getBoundingClientRect' in target)) {
		Object.defineProperty(target, 'getBoundingClientRect', {
			value: () => createZeroRect(),
		});
	}

	if (!('getClientRects' in target)) {
		Object.defineProperty(target, 'getClientRects', {
			value: () => emptyClientRectList,
		});
	}
}

installRectPolyfill(typeof Range !== 'undefined' ? Range.prototype : undefined);
installRectPolyfill(typeof Text !== 'undefined' ? Text.prototype : undefined);
