// test/integration/config/main-config-loader.test.1.4.3.js
const { mainConfigLoaderPath } = require('@paths');
const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const os = require('os');
const MainConfigLoader = require(mainConfigLoaderPath);

describe('MainConfigLoader (1.4.3)', () => {
  let osHomdirStub;
  let originalXdgConfigHome;

  beforeEach(() => {
    // Store original environment variable and stub os.homedir()
    originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    // Ensure XDG_CONFIG_HOME is not set to confirm that the provided parameter takes precedence
    delete process.env.XDG_CONFIG_HOME;
    // Stub os.homedir to verify it's not called when a specific xdgBaseDir is provided
    osHomdirStub = sinon.stub(os, 'homedir');
  });

  afterEach(() => {
    // Restore original environment variable and os.homedir() stub
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
    osHomdirStub.restore();
  });

  describe('constructor', () => {
    const testProjectRoot = '/app/test-root';
    const providedXdgBaseDir = '/custom/path/to/xdg';

    it('1.4.3 Verify the constructor correctly uses the provided xdgBaseDir parameter when it\'s not null.', () => {
      // Instantiate MainConfigLoader, providing a specific xdgBaseDir
      const loader = new MainConfigLoader(testProjectRoot, null, false, providedXdgBaseDir);

      // Assert that xdgBaseDir is exactly what was provided to the constructor
      expect(loader.xdgBaseDir).to.equal(providedXdgBaseDir);

      // Assert that xdgGlobalConfigPath is correctly derived from the provided xdgBaseDir
      expect(loader.xdgGlobalConfigPath).to.equal(path.join(providedXdgBaseDir, 'config.yaml'));

      // Verify that os.homedir was NOT called, as the xdgBaseDir parameter was explicitly provided
      expect(osHomdirStub.called).to.be.false;
    });
  });
});
