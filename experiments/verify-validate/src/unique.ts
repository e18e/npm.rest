/**
 * Deeply compares two values for equality
 */
function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;

	if (a === null || b === null) {
		return a === b;
	}

	if (typeof a !== typeof b) return false;

	if (typeof a !== 'object') return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}

	if (Array.isArray(a) || Array.isArray(b)) return false;

	// Both are objects at this point
	const objA = a as Record<string, unknown>;
	const objB = b as Record<string, unknown>;

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual(objA[key], objB[key])) return false;
	}

	return true;
}

/**
 * Mutates an array to remove deeply duplicate items
 * @param arr - The array to mutate
 * @returns The mutated array (same reference)
 */
export function uniqueDeep<T>(arr: T[]): T[] {
	for (let i = 0; i < arr.length; i++) {
		for (let j = i + 1; j < arr.length; j++) {
			if (deepEqual(arr[i], arr[j])) {
				arr.splice(j, 1);
				j--;
			}
		}
	}
	return arr;
}
