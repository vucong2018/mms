import * as lodash_string from 'lodash-es/string';

export function string_utils(app) {
    app.utils = {
        ...app.utils,
        string: {
            ...lodash_string,
            // Add custom array utils here

        }
    };

    String.prototype.replaceAll = function (search, replacement) {
        return this.replace(new RegExp(search, 'g'), replacement);
    };

    String.prototype.normalizedName = function () {
        let convertToArray = this.toLowerCase().split(' ');
        let result = convertToArray.map(function (val) {
            return val.replace(val.charAt(0), val.charAt(0).toUpperCase());
        });
        return result.join(' ');
    };

    String.prototype.numberDisplay = function (replaceValue = '.') {
        const decimalSplitter = replaceValue == '.' ? ',' : '.';
        let [integer, decimal] = this.split('.');
        if (!decimal) [integer, decimal] = this.split(',');
        return `${integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, replaceValue)}${decimal ? decimalSplitter : ''}${decimal || ''}`;
    };

    String.prototype.getFirstLetters = function () {
        return this.toUpperCase().split(' ').map(word => word[0]).join('');
    };


}