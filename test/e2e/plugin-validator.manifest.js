const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    describe: '2.4.6: Should PASS a lint check for a structurally compliant plugin',
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    args: (pluginDir) => ['plugin', 'lint', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
      expect(stdout).to.include(`[USABLE] Plugin is USABLE`);
      expect(exitCode).to.equal(0);
    }
  },
  {
    describe: '2.4.6: Should FAIL a lint check if a required file is missing',
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    },
    args: (pluginDir) => ['plugin', 'lint', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
      expect(stdout).to.include(`[INVALID]`);
      expect(stdout).to.include("Missing required file: 'e2e-test-plugin.config.yaml'");
      expect(exitCode).to.equal(1);
    }
  },
  {
    describe: '2.4.5: Should default to v1 and WARN if protocol is missing',
    setup: async (pluginDir, pluginName) => {
        await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
        await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
        await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
        await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    args: (pluginDir) => ['plugin', 'lint', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
        expect(exitCode).to.equal(0);
        expect(stdout).to.include(`[USABLE]`);
        expect(stdout).to.include("Plugin protocol not found. Defaulting to 'v1'");
    }
  },
  {
    describe: '2.4.8: Should FAIL if the in-situ E2E test fails',
    setup: async (pluginDir, pluginName) => {
        const testDir = path.join(pluginDir, 'test');
        await fs.ensureDir(testDir);
        const failingTest = 'const assert = require("assert"); describe("Failing Test", () => it("should fail", () => assert.strictEqual(1, 0)));';
        await fs.writeFile(path.join(testDir, `${pluginName}-e2e.test.js`), failingTest);
    },
    args: (pluginDir) => ['plugin', 'test', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
        expect(exitCode).to.equal(1);
        expect(stdout).to.include('In-situ E2E test failed');
    }
  },
  {
    describe: '2.4.2: Should FAIL validation for a plugin with an unsupported protocol version',
    setup: async (pluginDir, pluginName) => {
      // Create a plugin with an unsupported protocol in its README.
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: A plugin with an unsupported protocol.`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `---
plugin_name: ${pluginName}
protocol: v99
---
`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
      const testDir = path.join(pluginDir, 'test');
      await fs.ensureDir(testDir);
      await fs.writeFile(path.join(testDir, `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));');
    },
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    assert: ({ exitCode, stdout, stderr }, expect) => {
      expect(stderr).to.include(`[✖] Plugin 'e2e-test-plugin' is INVALID.`);
      expect(stderr).to.include("Unsupported plugin protocol 'v99' for plugin 'e2e-test-plugin'.");
      expect(exitCode).to.equal(1);
    }
  }
];
