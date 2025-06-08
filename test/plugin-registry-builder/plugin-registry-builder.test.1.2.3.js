// test/plugin-registry-builder/plugin-registry-builder.test.1.2.3.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.3
describe('PluginRegistryBuilder constructor (1.2.3)', () => {

    let mockDependencies;
    const FAKE_PROJECT_ROOT = '/fake/project';
    const FAKE_HOME_DIR = '/fake/home';

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
            process: { env: {} }
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should determine cmCollRoot based on XDG_DATA_HOME when set', () => {
        // Arrange
        const FAKE_XDG_DATA_HOME = '/fake/data_home';
        mockDependencies.process.env.XDG_DATA_HOME = FAKE_XDG_DATA_HOME;

        // Act
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);

        // Assert
        expect(builder.cmCollRoot).to.equal('/fake/data_home/md-to-pdf/collections');
    });

    it('should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Linux)', () => {
        // Act
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);
        
        // Assert
        expect(builder.cmCollRoot).to.equal('/fake/home/.local/share/md-to-pdf/collections');
    });

    it('should determine cmCollRoot based on OS default when XDG_DATA_HOME is not set (Windows)', () => {
        // Arrange
        mockDependencies.os.platform.returns('win32');

        // Act
        const builder = new PluginRegistryBuilder(FAKE_PROJECT_ROOT, null, null, false, false, null, null, mockDependencies);

        // Assert
        expect(builder.cmCollRoot).to.equal('/fake/home/AppData/Local/md-to-pdf/collections');
    });
});
