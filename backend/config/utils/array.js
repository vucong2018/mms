import * as array_toolkit from 'lodash-es/array';

export function array_utils(app) {
    Array.prototype.contains = function (pattern) {
        return pattern.reduce((result, item) => result && this.includes(item), true);
    };

    Array.prototype.exists = function (pattern) {
        return pattern.reduce((result, item) => result || this.includes(item), false);
    };

    app.utils = {
        ...app.utils,
        array: {
            ...array_toolkit,
            contains: Array.prototype.contains,
            exists: Array.prototype.exists
        }
    };
}