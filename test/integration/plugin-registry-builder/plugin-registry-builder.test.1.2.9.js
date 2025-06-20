// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.9.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.9
describe('PluginRegistryBuilder _resolvePluginConfigPath (1.2.9)', () => {

    it('should resolve a relative raw path against the provided basePathForMainConfig', () => {
        // Arrange
        const RAW_PATH = './my-plugin.config.yaml';
        const BASE_PATH = '/path/to/main/config/dir';
        const FINAL_RESOLVED_PATH = '/path/to/main/config/dir/my-plugin.config.yaml';

        const mockDependencies = {
            os: {
                homedir: () => '/fake/home',
                platform: () => 'linux'
            },
            path: {
                join: (a, b) => `${a}/${b}`,
                isAbsolute: sinon.stub().returns(false),
                dirname: () => '',
                resolve: sinon.stub().withArgs(BASE_PATH, RAW_PATH).returns(FINAL_RESOLVED_PATH)
            },
            fs: {
                existsSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns(true),
                statSync: sinon.stub().withArgs(FINAL_RESOLVED_PATH).returns({ isFile: () => true, isDirectory: () => false })
            },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

        const builder = new PluginRegistryBuilder('/fake/project', null, null, false, false, null, null, mockDependencies);

        // Act
        const result = builder._resolvePluginConfigPath(RAW_PATH, BASE_PATH, null);

        // Assert
        expect(result).to.equal(FINAL_RESOLVED_PATH);
        // Verify that path.resolve was called correctly
        expect(mockDependencies.path.resolve.calledWith(BASE_PATH, RAW_PATH)).to.be.true;
    });
    
    afterEach(() => {
        sinon.restore();
    });
});
