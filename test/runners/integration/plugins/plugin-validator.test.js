// test/runners/integration/plugins/plugin-validator.test.js
require('module-alias/register');
const {
  captureLogsPath,
  projectRoot,
  pluginValidatorManifestPath,
  validatorPath,
  v1Path
} = require('@paths');
const { logs, testLogger, clearLogs } = require(captureLogsPath);
const testManifest = require(pluginValidatorManifestPath);

require('chalk').level = 0; // Disable all chalk colors for this test run

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const fs = require('fs');

const proxyquire = require('proxyquire');

describe(`plugin-validator (Subsystem Integration Tests) ${path.relative(projectRoot, validatorPath)}`, function() {
  this.timeout(5000);
  let tempDir;
  let mockFs, mockExecSync, mockYaml, mockOs;

  beforeEach(function() {
    clearLogs();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-test-'));

    mockFs = {
      existsSync: sinon.stub().returns(false),
      statSync: sinon.stub(),
      readFileSync: sinon.stub().returns(''),
      readdirSync: sinon.stub().returns([]),
      mkdtempSync: sinon.stub().returns(tempDir),
      rmSync: sinon.stub(),
    };
    mockExecSync = sinon.stub();
    mockYaml = {
      load: sinon.stub().returns({}),
    };
    mockOs = {
      homedir: sinon.stub().returns('/fake/home'),
      tmpdir: sinon.stub().returns(os.tmpdir()),
    };
  });

  afterEach(function() {
    fs.rmSync(tempDir, { recursive: true, force: true });
    sinon.restore();
  });

  testManifest.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      setup,
      assert,
      pluginName,
    } = testCase;

    it_(description, async function() {
      const v1Validator = proxyquire(v1Path, {
        fs: mockFs,
        path,
        'child_process': { execSync: mockExecSync },
        yaml: mockYaml,
        os: mockOs,
        '@paths': {
          projectRoot: '/fake/root',
          cliPath: '/fake/root/cli.js',
          mochaPath: '/fake/root/node_modules/mocha/bin/mocha',
          nodeModulesPath: '/fake/root/node_modules',
          logger: testLogger
        }
      });

      const { validate } = proxyquire(validatorPath, {
        fs: mockFs,
        path,
        yaml: mockYaml,
        [v1Path]: v1Validator,
        '@paths': {
          projectRoot: '/fake/root',
          v1Path: v1Path,
          logger: testLogger
        }
      });

      const mocks = { mockFs, mockExecSync, mockYaml, tempDir };
      const constants = {};

      if (setup) {
        setup(mocks);
      }

      const result = validate(path.join(tempDir, pluginName));
      await assert(result, mocks, constants, expect, logs);
    });
  });
});
