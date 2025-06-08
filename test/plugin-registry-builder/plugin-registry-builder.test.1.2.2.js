// test/plugin-registry-builder/plugin-registry-builder.test.1.2.2.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.2
describe('PluginRegistryBuilder constructor (1.2.2)', () => {

    it('should throw an error if projectRoot is not provided (null)', () => {
        // Assert that calling the constructor with a null projectRoot throws an error
        expect(() => new PluginRegistryBuilder(null)).to.throw(
            'PluginRegistryBuilder: projectRoot must be a valid path string.'
        );
    });

    it('should throw an error if projectRoot is not provided (undefined)', () => {
        // Assert that calling the constructor with an undefined projectRoot throws an error
        expect(() => new PluginRegistryBuilder(undefined)).to.throw(
            'PluginRegistryBuilder: projectRoot must be a valid path string.'
        );
    });

    it('should throw an error if projectRoot is not a string', () => {
        // Assert that calling the constructor with a non-string projectRoot throws an error
        expect(() => new PluginRegistryBuilder(12345)).to.throw(
            'PluginRegistryBuilder: projectRoot must be a valid path string.'
        );
    });
});
