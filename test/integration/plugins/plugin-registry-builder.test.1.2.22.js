// test/integration/plugins/plugin-registry-builder.test.1.2.22.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.22
describe('PluginRegistryBuilder buildRegistry (1.2.22)', () => {
    it('should only load from factory defaults when useFactoryDefaultsOnly is true', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => 'config.example.yaml' },
            fs: { existsSync: sinon.stub().returns(true) },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, null, true, false, null, null, mockDependencies);

        // Stub the internal method to track calls
        const getFromFileStub = sinon.stub(builder, '_getPluginRegistrationsFromFile');
        getFromFileStub.withArgs(builder.factoryDefaultMainConfigPath).resolves({ 'factory-plugin': {} });

        // Act
        const result = await builder.buildRegistry();

        // Assert
        // 1. Verify it was called only once, for the factory default file.
        expect(getFromFileStub.calledOnce).to.be.true;
        expect(getFromFileStub.calledWith(builder.factoryDefaultMainConfigPath)).to.be.true;
        
        // 2. Verify the result is from that single call.
        expect(result).to.have.property('factory-plugin');
    });
    
    afterEach(() => {
        sinon.restore();
    });
});
