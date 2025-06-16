// test/e2e/plugin-validate.manifest.js
const fs = require('fs-extra');
const path = require('path');

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
    await fs.ensureDir(path.join(pluginDir, '.contract')); 
    await fs.ensureDir(path.join(pluginDir, '.contract/test'));
    await fs.writeFile(path.join(pluginDir, '.contract/test', `${pluginName}-e2e.test.js`), 'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));');    
    await fs.writeFile(path.join(pluginDir, `.contract/${pluginName}.schema.json`), `{}`);
    await fs.writeFile(path.join(pluginDir, `${pluginName}.config.yaml`), `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0`);     
    await fs.writeFile(path.join(pluginDir, 'README.md'), `---\nplugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\n---\n# ${pluginName}`);         
}           

module.exports = [
  {
    describe: '3.9.1: (Happy Path) Successfully validates a well-formed plugin directory',
    setup: async (sandboxDir) => {
        const pluginDir = path.join(sandboxDir, 'well-formed-plugin');
        await createWellFormedPlugin(pluginDir, 'well-formed-plugin');
    },
    args: (sandboxDir) => [
      'plugin',
      'validate',
      path.join(sandboxDir, 'well-formed-plugin'),
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/Plugin 'well-formed-plugin' is VALID/i);
    },
  },
  {
    describe: '3.9.2: (Sad Path) Fails validation for a poorly-formed plugin directory',
    setup: async (sandboxDir) => {
        const pluginDir = path.join(sandboxDir, 'poorly-formed-plugin');
        await fs.ensureDir(pluginDir);
        await fs.writeFile(path.join(pluginDir, `poorly-formed-plugin.config.yaml`), `description: A poorly-formed plugin.`);
        await fs.writeFile(path.join(pluginDir, `README.md`), '# Incomplete Plugin');
    },
    args: (sandboxDir) => [
      'plugin',
      'validate',
      path.join(sandboxDir, 'poorly-formed-plugin'),
    ],
    assert: async ({ exitCode, stdout, stderr }, sandboxDir, expect) => {
      expect(exitCode).to.equal(1);
      expect(stdout).to.match(/Plugin 'poorly-formed-plugin' is INVALID/i);
      expect(stderr).to.match(/Missing required file: 'index.js'/i);
    },
  },
];
