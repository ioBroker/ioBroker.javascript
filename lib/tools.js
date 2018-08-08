/**
 * Tests whether the given variable is a real object and not an Array
 * @param {any} it The variable to test
 */
function isObject(it) {
	// This is necessary because:
	// typeof null === 'object'
	// typeof [] === 'object'
	// [] instanceof Object === true
	return Object.prototype.toString.call(it) === '[object Object]';
}

/**
 * Tests whether the given variable is really an Array
 * @param {any} it The variable to test
 */
function isArray(it) {
	if (Array.isArray != null) return Array.isArray(it);
	return Object.prototype.toString.call(it) === '[object Array]';
}

module.exports = {
	isArray,
	isObject,
};
