// test/integration/plugins/plugin-registry-builder.test.1.2.6.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.6
describe('PluginRegistryBuilder _resolveAlias (1.2.6)', () => {

    let builder;

    beforeEach(() => {
        // Provide a complete mock to ensure constructor succeeds before we test the method.
        const mockDependencies = {
            os: {
                homedir: sinon.stub().returns('/fake/home'),
                platform: sinon.stub().returns('linux')
            },
            path: {
                join: (a, b) => `${a}/${b}`,
                isAbsolute: sinon.stub().returns(false),
                dirname: () => '',
                resolve: () => ''
            },
            fs: { existsSync: () => true },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };
        builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return null for a null aliasValue', () => {
        const result = builder._resolveAlias('my-alias', null, '/some/base');
        expect(result).to.be.null;
    });

    it('should return null for an empty string aliasValue', () => {
        const result = builder._resolveAlias('my-alias', '   ', '/some/base');
        expect(result).to.be.null;
    });

    it('should return null for a relative path when basePathDefiningAlias is missing', () => {
        // Arrange
        // The mock path.isAbsolute will return false for this input.

        // Act
        const result = builder._resolveAlias('my-alias', './relative/path', null);

        // Assert
        expect(result).to.be.null;
    });
});
