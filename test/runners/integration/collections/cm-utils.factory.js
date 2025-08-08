// test/runners/integration/collections/cm-utils.factory.js
const { cmUtilsPath } = require('@paths');
const { expect } = require('chai');

function makeCmUtilsScenario({ description, testId, method, args, expected }) {
  const assert = () => {
    const utils = require(cmUtilsPath);
    const func = utils[method];
    if (typeof func !== 'function') {
      throw new Error(`Method '${method}' not found in cm-utils.js`);
    }
    const result = func(...args);
    expect(result).to.equal(expected);
  };

  return {
    description: `${testId}: ${description}`,
    assert,
  };
}

module.exports = { makeCmUtilsScenario };
