// test/runners/integration/plugins/plugin-validator.factory.js
const path = require('node:path');
const sinon = require('sinon');

function setupPluginScenario({ files = {}, yaml = {}, exec = {} }) {
  return (pluginDir, _pluginName, { mockFs, mockYaml, mockExecSync }) => {
    Object.entries(files).forEach(([file, value]) => {
      const fullPath = path.join(pluginDir, file);
      if (typeof value === 'object' && value !== null) {
        mockFs.existsSync.withArgs(fullPath).returns(value.exists);
        if (value.exists && value.content !== undefined) {
          mockFs.readFileSync.withArgs(fullPath, 'utf8').returns(value.content);
        }
      } else {
        mockFs.existsSync.withArgs(fullPath).returns(!!value);
        if (value) {
          mockFs.readFileSync
            .withArgs(fullPath, 'utf8')
            .returns('dummy content');
        }
      }
    });

    Object.entries(yaml).forEach(([_file, value]) => {
      if (value instanceof Error) {
        mockYaml.load.withArgs(sinon.match.any).throws(value);
      } else {
        mockYaml.load.withArgs(sinon.match.any).returns(value);
      }
    });

    if (exec.throws) {
      mockExecSync.throws(new Error(exec.throws));
    } else if (exec.returns !== undefined) {
      mockExecSync.returns(exec.returns);
    }
  };
}

function setupWellFormedPlugin(
  pluginDir,
  pluginName,
  { mockFs, mockExecSync, mockYaml },
) {
  const files = {
    'index.js': 'module.exports = class {};',
    [`${pluginName}.config.yaml`]: `plugin_name: ${pluginName}\nprotocol: v1\nversion: 1.0.0\ndescription: A valid plugin.`,
    'README.md': '---\ncli_help: "Help text"\n---',
    [`${pluginName}-example.md`]: '# Example',
    [`.contract/test/${pluginName}-e2e.test.js`]:
      'const assert = require("assert"); describe("Passing Test", () => it("should pass", () => assert.strictEqual(1, 1)));',
    [`.contract/${pluginName}.schema.json`]: '{}',
  };

  for (const [file, content] of Object.entries(files)) {
    const fullPath = path.join(pluginDir, file);
    const dir = path.dirname(fullPath);
    mockFs.existsSync.withArgs(dir).returns(true);
    mockFs.statSync.withArgs(dir).returns({ isDirectory: () => true });
    mockFs.existsSync.withArgs(fullPath).returns(true);
    mockFs.readFileSync.withArgs(fullPath, 'utf8').returns(content);
    mockFs.statSync
      .withArgs(fullPath)
      .returns({ isDirectory: () => false, isFile: () => true });
  }

  mockYaml.load.withArgs(sinon.match.any).returns({
    plugin_name: pluginName,
    protocol: 'v1',
    version: '1.0.0',
    description: 'A valid plugin.',
  });
  mockYaml.load
    .withArgs(sinon.match(/cli_help/))
    .returns({ cli_help: 'Help text' });

  mockExecSync.returns('');
}

function makeValidatorScenario({
  description,
  pluginName = 'test-plugin',
  setup,
  expectedResult,
  expectedLogs = [],
}) {
  const factorySetup = (mocks) => {
    const { mockFs, tempDir } = mocks;
    const pluginDir = path.join(tempDir, pluginName);
    mockFs.existsSync.withArgs(pluginDir).returns(true);
    mockFs.statSync.withArgs(pluginDir).returns({ isDirectory: () => true });

    if (setup) {
      setup(pluginDir, pluginName, mocks);
    }
  };

  const assert = async (result, _mocks, _constants, expect, logs) => {
    if (expectedResult) {
      expect(result.isValid).to.equal(expectedResult.isValid);

      if (expectedResult.errors) {
        expectedResult.errors.forEach((expectedErr) => {
          expect(
            result.errors.some((actualErr) =>
              typeof expectedErr === 'string'
                ? actualErr.includes(expectedErr)
                : expectedErr.test(actualErr),
            ),
            `Expected error: ${expectedErr}\nActual errors: ${JSON.stringify(result.errors, null, 2)}`,
          ).to.be.true;
        });
      }

      if (expectedResult.warnings) {
        expectedResult.warnings.forEach((expectedWarn) => {
          expect(
            result.warnings.some((actualWarn) =>
              typeof expectedWarn === 'string'
                ? actualWarn.includes(expectedWarn)
                : expectedWarn.test(actualWarn),
            ),
            `Expected warning: ${expectedWarn}\nActual warnings: ${JSON.stringify(result.warnings, null, 2)}`,
          ).to.be.true;
        });
      }
    }

    if (expectedLogs.length > 0) {
      const relevantLogs = logs.map((l) => ({ level: l.level, msg: l.msg }));
      expectedLogs.forEach((log) => {
        expect(relevantLogs).to.deep.include(log);
      });
    }
  };

  return {
    description,
    pluginName,
    setup: factorySetup,
    assert,
  };
}

module.exports = {
  makeValidatorScenario,
  setupWellFormedPlugin,
  setupPluginScenario,
};
