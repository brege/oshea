// test/integration/plugins/plugin-registry-builder.test.1.2.1.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/plugins/PluginRegistryBuilder');

// Test suite for Scenario 1.2.1
describe('PluginRegistryBuilder constructor (1.2.1)', () => {

    let mockDependencies;
    const FAKE_PROJECT_ROOT = '/fake/project';
    const FAKE_HOME_DIR = '/fake/home';
    const FAKE_MANIFEST_PATH = '/fake/project/manifest.yaml';
    const FAKE_MANIFEST_DIR = '/fake/project';
    const FAKE_COLL_ROOT = '/fake/coll-root'; // Define a constant for the fake collections root

    beforeEach(() => {
        mockDependencies = {
            fs: { existsSync: sinon.stub().returns(true) },
            os: {
                homedir: sinon.stub().returns(FAKE_HOME_DIR),
                platform: sinon.stub().returns('linux') // Default to a non-windows platform
            },
            path: {
                join: (a, b) => `${a}/${b}`,
                dirname: sinon.stub().returns(FAKE_MANIFEST_DIR)
            },
            process: { env: {} },
            // Add the mandatory collRoot dependency to the mock object
            collRoot: FAKE_COLL_ROOT
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly initialize paths using default OS home directory', () => {
        // Act
        const builder = new PluginRegistryBuilder(
            FAKE_PROJECT_ROOT,
            null, // xdgBaseDir
            FAKE_MANIFEST_PATH,
            false, false, null, null,
            mockDependencies
        );

        // Assert
        expect(builder.projectRoot).to.equal(FAKE_PROJECT_ROOT);
        expect(builder.projectManifestConfigPath).to.equal(FAKE_MANIFEST_PATH);
        expect(builder.projectManifestBaseDir).to.equal(FAKE_MANIFEST_DIR);
        expect(builder.xdgBaseDir).to.equal(`${FAKE_HOME_DIR}/.config/md-to-pdf`);
    });

    it('should correctly initialize paths using the XDG_CONFIG_HOME environment variable when set', () => {
        // Arrange
        const FAKE_XDG_CONFIG_HOME = '/fake/xdg_config';
        mockDependencies.process.env.XDG_CONFIG_HOME = FAKE_XDG_CONFIG_HOME;

        // Act
        const builder = new PluginRegistryBuilder(
            FAKE_PROJECT_ROOT,
            null,
            FAKE_MANIFEST_PATH,
            false, false, null, null,
            mockDependencies
        );

        // Assert
        expect(builder.xdgBaseDir).to.equal(`${FAKE_XDG_CONFIG_HOME}/md-to-pdf`);
    });
});
