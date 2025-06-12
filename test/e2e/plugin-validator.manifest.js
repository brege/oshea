// dev/test/e2e/plugin-validator.manifest.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os'); 

function expectStringsOnSameLine(output, strings, expect) {
  expect(
    output.split('\n').some(line =>
      strings.every(str => new RegExp(str, 'i').test(line))
    )
  ).to.be.true;
}

// Helper to create a dummy plugin that is fully compliant with the v1 contract
async function createWellFormedPlugin(pluginDir, pluginName) {
    await fs.ensureDir(path.join(pluginDir, 'test'));

    const handlerContent = `
class DummyHandler {
    constructor(coreUtils) {}
    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const fs = require('fs').promises;
        const path = require('path');
        const pdfPath = path.join(outputDir, outputFilenameOpt || 'dummy.pdf');
        await fs.writeFile(pdfPath, 'dummy pdf content');
        return pdfPath;
    }
}
module.exports = DummyHandler;
`;
    await fs.writeFile(path.join(pluginDir, 'index.js'), handlerContent);
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `description: A well-formed plugin.`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    await fs.writeFile(path.join(pluginDir, 'test', `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));');
    await fs.writeFile(path.join(pluginDir, `${pluginName}.schema.json`), `{}`);
    await fs.writeFile(path.join(pluginDir, 'README.md'), `---\nplugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\n---\n# ${pluginName}`);
}


module.exports = [
  {
    describe: '2.4.6: Should PASS a validation check for a structurally compliant plugin',
    args: (pluginDir) => ['plugin', 'validate', pluginDir], 
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    assert: ({ exitCode, stdout }, expect) => {
      expect(exitCode).to.equal(0);
      expect(/USABLE/.test(stdout)).to.be.true;
    }
  },
  {
    describe: '2.4.6: Should FAIL a validation check if a required file is missing',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
    },
    assert: ({ exitCode, stdout, stderr }, expect) => { 
      expect(exitCode).to.equal(1);
      expect(/INVALID/.test(stdout)).to.be.true;
      expect(stderr).to.include('Missing required file: \'README.md\''); 
    }
  },
  {
    describe: '2.4.5: Should default to v1 and WARN if protocol is missing',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
        await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
        await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
        await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
        await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    assert: ({ exitCode, stdout }, expect) => {
        expect(exitCode).to.equal(0);
        expect(/USABLE/.test(stdout)).to.be.true;
        expect(/protocol not found/i.test(stdout)).to.be.true;
    }
  },
  {
    describe: '2.4.8: Should FAIL if the in-situ E2E test fails',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
        const testDir = path.join(pluginDir, 'test');
        await fs.ensureDir(testDir);
        await fs.writeFile(path.join(testDir, `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Failing Test", () => it("should fail", () => assert.strictEqual(1, 0)));');
    },
    assert: ({ exitCode, stdout }, expect) => {
        expect(exitCode).to.equal(1);
        expectStringsOnSameLine(stdout, ['In-situ',  'failed'], expect);
    }
  },
  {
    describe: '2.4.1: Should report a fully compliant plugin as VALID',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
        // Use the helper to create a plugin that meets all VALID criteria
        await createWellFormedPlugin(pluginDir, pluginName);
    },
    assert: ({ exitCode, stdout, stderr }, expect) => {
        expect(exitCode).to.equal(0);
        expect(/VALID/.test(stdout)).to.be.true;
        expect(stderr).to.not.match(/error/i);
    }
  },
  {
    describe: '2.4.2: Should FAIL validation for a plugin with an unsupported protocol',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `---
protocol: v99
---`);
    },
    assert: ({ exitCode, stdout, stderr }, expect) => {
      expect(exitCode).to.equal(1);
      expect(/INVALID/.test(stdout)).to.be.true;
      expectStringsOnSameLine(stderr, ['Unsupported', 'protocol'], expect);
    }
  },
  {
    describe: '2.4.3: Should FAIL validation if directory name mismatches metadata plugin_name',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `e2e-test-plugin.config.yaml`), `name: e2e-test-plugin`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `---
plugin_name: mismatched-plugin-name
---`);
    },
    assert: ({ exitCode, stdout, stderr }, expect) => {
      expect(exitCode).to.equal(1);
      expect(/INVALID/.test(stderr)).to.be.true;
      expectStringsOnSameLine(stderr, ['plugin', 'name', 'not', 'match'], expect);
    }
  },
  {
    describe: '2.4.4: Should respect metadata precedence for `protocol` (.schema > .config > README)',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, 'README.md'), `---
protocol: v1
---`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}\nprotocol: v1`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}.schema.json`), `{"protocol": "v99"}`);
    },
    assert: ({ exitCode, stderr, stdout }, expect) => {
      expect(exitCode).to.equal(1);
      expect(/INVALID/.test(stdout)).to.be.true;
      expectStringsOnSameLine(stderr, ['Unsupported', 'protocol'], expect);
      expectStringsOnSameLine(stdout, ['Protocol', 'v99'], expect);
    }
  },
  {
    describe: '2.4.7: Should report USABLE (with warnings) for a plugin with a missing optional file',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}\nprotocol: v1`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
    },
    assert: ({ exitCode, stdout }, expect) => {
      expect(exitCode).to.equal(0);
      expect(/USABLE/.test(stdout)).to.be.true;
      expectStringsOnSameLine(stdout, ['Missing', 'test', 'directory'], expect);
    }
  },
  {
    describe: '2.4.10: Should report USABLE (with warnings) for malformed README.md front matter',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}\nprotocol: v1`);
      await fs.writeFile(path.join(pluginDir, `${pluginName}-example.md`), '# Example');
      const badReadme = '---\nname: my-plugin\ndescription: an: invalid value\n---\n# My Plugin';
      await fs.writeFile(path.join(pluginDir, 'README.md'), badReadme);
    },
    assert: ({ exitCode, stdout }, expect) => {
      expect(exitCode).to.equal(0);
      expectStringsOnSameLine(stdout, ['matter', 'README', 'not'], expect);
      
    }
  },
  {
    describe: '2.4.9: Should report as INVALID when plugin self-activation fails',
    args: (pluginDir) => ['plugin', 'validate', pluginDir],
    setup: async (pluginDir, pluginName) => {
      await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `name: ${pluginName}\nprotocol: v1`);
      await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
    },
    assert: async ({ exitCode, stdout, stderr }, expect) => {
      expect(exitCode).to.equal(1);
      expect(/INVALID/.test(stdout)).to.be.true; 
      expect(stderr).to.match(/Self-activation failed/i);
    }
  },
];
