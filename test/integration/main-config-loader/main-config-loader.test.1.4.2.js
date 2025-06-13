// test/integration/main-config-loader/main-config-loader.test.1.4.2.js
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const os = require('os');
const MainConfigLoader = require('../../../src/main_config_loader');

describe('MainConfigLoader (1.4.2)', () => {
    let osHomdirStub;
    let originalXdgConfigHome;

    beforeEach(() => {
        // Store original environment variable and stub os.homedir()
        originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
        // Stub os.homedir to control the mocked home directory
        osHomdirStub = sinon.stub(os, 'homedir');
    });

    afterEach(() => {
        // Restore original environment variable and os.homedir() stub
        process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
        osHomdirStub.restore();
    });

    describe('constructor', () => {
        const testProjectRoot = '/app/test-root';
        const mockOsHomeDir = '/home/testuser';
        const xdgConfigDirName = 'md-to-pdf'; // As defined in src/main_config_loader.js

        it('1.4.2 Test the constructor correctly determines xdgBaseDir and xdgGlobalConfigPath using XDG_CONFIG_HOME environment variable if xdgBaseDir parameter is null.', () => {
            const mockXdgConfigHome = '/custom/xdg/config';
            process.env.XDG_CONFIG_HOME = mockXdgConfigHome;
            osHomdirStub.returns(mockOsHomeDir); // This stub should not be called if XDG_CONFIG_HOME is set

            // Instantiate MainConfigLoader without providing xdgBaseDir parameter (it will be null/undefined)
            const loader = new MainConfigLoader(testProjectRoot, null, false, null);

            // Expected xdgBaseDir when XDG_CONFIG_HOME is set
            const expectedXdgBaseDir = path.join(mockXdgConfigHome, xdgConfigDirName);
            expect(loader.xdgBaseDir).to.equal(expectedXdgBaseDir);
            expect(loader.xdgGlobalConfigPath).to.equal(path.join(expectedXdgBaseDir, 'config.yaml'));
            expect(osHomdirStub.called).to.be.false; // os.homedir should not be called when XDG_CONFIG_HOME is set
        });

        it('1.4.2.a Test the constructor correctly determines xdgBaseDir and xdgGlobalConfigPath using os.homedir() fallback when XDG_CONFIG_HOME is NOT set and xdgBaseDir parameter is null.', () => {
            // Ensure XDG_CONFIG_HOME is undefined for this specific sub-test
            delete process.env.XDG_CONFIG_HOME;
            osHomdirStub.returns(mockOsHomeDir); // This stub should be called

            // Instantiate MainConfigLoader without providing xdgBaseDir parameter
            const loader = new MainConfigLoader(testProjectRoot, null, false, null);

            // Expected xdgBaseDir when XDG_CONFIG_HOME is not set, falling back to os.homedir()
            const expectedXdgBaseDir = path.join(mockOsHomeDir, '.config', xdgConfigDirName);
            expect(loader.xdgBaseDir).to.equal(expectedXdgBaseDir);
            // Corrected variable name from expectedXDG_BaseDir to expectedXdgBaseDir
            expect(loader.xdgGlobalConfigPath).to.equal(path.join(expectedXdgBaseDir, 'config.yaml'));
            expect(osHomdirStub.calledOnce).to.be.true; // os.homedir should be called once
        });
    });
});
