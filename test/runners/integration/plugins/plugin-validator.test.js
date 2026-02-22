// test/runners/integration/plugins/plugin-validator.test.js
require('module-alias/register');
const {
  captureLogsPath,
  projectRoot,
  pluginValidatorManifestPath,
  pluginValidatorPath,
  v1Path,
} = require('@paths');
const testLogger = require(captureLogsPath);
const { logs, clearLogs } = testLogger;
const testManifest = require(pluginValidatorManifestPath);

require('chalk').level = 0; // Disable all chalk colors for this test run

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const proxyquire = require('proxyquire');

describe(`plugin-validator (Subsystem Integration Tests) ${path.relative(projectRoot, pluginValidatorPath)}`, function () {
  this.timeout(5000);
  let tempDir;
  let mockFs, mockExecSync, mockYaml, mockOs;

  beforeEach(() => {
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

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    sinon.restore();
  });

  testManifest.forEach((testCase) => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const { description, setup, assert, pluginName } = testCase;

    it_(description, async () => {
      const v1Validator = proxyquire(v1Path, {
        'node:fs': mockFs,
        'node:path': path,
        'node:child_process': { execSync: mockExecSync },
        'js-yaml': mockYaml,
        'node:os': mockOs,
        '@paths': {
          projectRoot: '/fake/root',
          cliPath: '/fake/root/cli.js',
          mochaPath: '/fake/root/node_modules/mocha/bin/mocha',
          nodeModulesPath: '/fake/root/node_modules',
          loggerPath: captureLogsPath,
        },
      });

      const { validate } = proxyquire(pluginValidatorPath, {
        'node:fs': mockFs,
        'node:path': path,
        'js-yaml': mockYaml,
        [v1Path]: v1Validator,
        '@paths': {
          projectRoot: '/fake/root',
          v1Path: v1Path,
          loggerPath: captureLogsPath,
        },
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
