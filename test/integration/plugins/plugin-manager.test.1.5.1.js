// test/integration/plugins/plugin-manager.test.1.5.1.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// Import the refactored PluginManager
const PluginManager = require('../../../src/plugins/PluginManager');

describe('PluginManager constructor (1.5.1)', () => {
    let pluginManager;

    beforeEach(() => {
        // Instantiate PluginManager without coreUtils as it no longer accepts it
        pluginManager = new PluginManager();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should initialize without throwing errors', () => {
        // Assert that no error was thrown implicitly by the successful instantiation
        expect(pluginManager).to.be.an.instanceOf(PluginManager);

        // Assert that there are no enumerable properties on the instance (coreUtils is now internal to the module)
        const instanceProperties = Object.keys(pluginManager);
        expect(instanceProperties).to.have.lengthOf(0);
    });
});
