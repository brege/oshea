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
      expect(stdout).to.include(`[INVALID] Plugin is INVALID`);
      expect(stdout).to.include("Missing required file: 'e2e-test-plugin.config.yaml'");
      expect(exitCode).to.equal(1);
    }
  },
  {
    describe: '2.4.2: Should FAIL for an unsupported protocol (e.g., v99)',
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}\nprotocol: 99`);
    },
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    assert: ({ exitCode, stderr }, expect) => {
      // FIX: The thrown error is caught and printed to stderr.
      expect(stderr).to.include("Unsupported protocol: 99");
      expect(exitCode).to.equal(1);
    }
  },
  {
    describe: '2.4.3: Should FAIL if directory name mismatches metadata name',
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: wrong-plugin-name`);
    },
    args: (pluginDir) => ['plugin', 'lint', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
      // FIX: With the logic added back, this check will now work.
      expect(stdout).to.include(`[INVALID] Plugin is INVALID`);
      expect(stdout).to.include("does not match plugin directory name");
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
    describe: '2.4.10: Should WARN on malformed README YAML front matter',
    setup: async (pluginDir, pluginName) => {
        await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
        await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
        await fs.writeFile(path.join(pluginDir, 'README.md'), '---\nplugin_name: unclosed "quote\n---\n# Test');
        await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    args: (pluginDir) => ['plugin', 'lint', pluginDir],
    assert: ({ exitCode, stdout }, expect) => {
        expect(exitCode).to.equal(0);
        expect(stdout).to.include('[USABLE]');
        // FIX: Assert on a more general, robust substring of the warning.
        expect(stdout).to.include('Could not parse YAML front matter');
    }
  }
];
