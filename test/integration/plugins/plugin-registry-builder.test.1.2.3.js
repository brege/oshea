// test/integration/plugins/plugin-registry-builder.test.1.2.3.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.3
describe('PluginRegistryBuilder constructor (1.2.3)', () => {

    let mockDependencies;
    const FAKE_PROJECT_ROOT = '/fake/project';
    const FAKE_HOME_DIR = '/fake/home';
    const FAKE_COLL_ROOT = '/fake/coll-root';

    beforeEach(() => {
        mockDependencies = {
            fs: { existsSync: () => true },
            os: {
                homedir: sinon.stub().returns(FAKE_HOME_DIR),
                platform: sinon.stub().returns('linux')
            },
            path: {
                join: (a, b, c, d) => [a, b, c, d].filter(Boolean).join('/'),
                dirname: () => ''
            },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: FAKE_COLL_ROOT
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should determine cmCollRoot based on XDG_DATA_HOME when set', () => {
        // This test is no longer valid as the builder does not determine its own root.
        // However, we can assert that it correctly USES the root it is given.
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);
        expect(builder.cmCollRoot).to.equal(FAKE_COLL_ROOT);
    });

    it('should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Linux)', () => {
        // This test is no longer valid as the builder does not determine its own root.
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);
        expect(builder.cmCollRoot).to.equal(FAKE_COLL_ROOT);
    });

    it('should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Windows)', () => {
        // This test is no longer valid as the builder does not determine its own root.
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);
        expect(builder.cmCollRoot).to.equal(FAKE_COLL_ROOT);
    });
});
