/* eslint-env node */
'use strict';
const path = require('path');

module.exports = {
    name: 'class-coverage-gate',
    description: '',
    run({ususedClasses = 0, stylelessClasses = 0, reportPath = './class-coverage/report.json'}) {
        const { classesWithNoStyles, unusedStyledClasses } = require(path.resolve(reportPath));
        return new Promise((resolve, reject) => {
            if (classesWithNoStyles > stylelessClasses) {
                reject(`Expected ${stylelessClasses} styleless classes but found ${classesWithNoStyles}`)
            } else if (unusedStyledClasses > ususedClasses) {
                reject(`Expected ${ususedClasses} styleless classes but found ${unusedStyledClasses}`)
            }
            resolve('Class coverage gate cleared');
        });
    }
};