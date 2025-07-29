// test/runners/integration/collections/collections-manager.test.js
require('module-alias/register');
const {
  projectRoot,
  collectionsIndexPath,
  cmUtilsPath,
  captureLogsPath,
  collectionsManagerAddManifestPath,
  collectionsManagerRemoveManifestPath,
  collectionsManagerUpdateManifestPath,
  collectionsManagerListManifestPath,
  collectionsManagerEnableDisableManifestPath,
  collectionsManagerConstructorManifestPath,
  collectionsManagerDisableManifestPath
} = require('@paths');

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { logs, clearLogs } = require(captureLogsPath);
const testLoggerPath = captureLogsPath;

const addManifest = require(collectionsManagerAddManifestPath);
const removeManifest = require(collectionsManagerRemoveManifestPath);
const updateManifest = require(collectionsManagerUpdateManifestPath);
const listManifest = require(collectionsManagerListManifestPath);
const enableDisableManifest = require(collectionsManagerEnableDisableManifestPath);
const constructorManifest = require(collectionsManagerConstructorManifestPath);
const disableManifest = require(collectionsManagerDisableManifestPath);

const allTestCases = [
  ...addManifest,
  ...removeManifest,
  ...updateManifest,
  ...listManifest,
  ...enableDisableManifest,
  ...constructorManifest,
  ...disableManifest,
];

const FAKE_COLL_ROOT = '/fake/collRoot';

describe(`collections-manager (Subsystem Integration Tests) ${path.relative(projectRoot, collectionsIndexPath)}`, function() {
  let mockDependencies;
  let CollectionsManager;

  beforeEach(function() {
    clearLogs();

    mockDependencies = {
      fss: {
        existsSync: sinon.stub(),
        lstatSync: sinon.stub(),
      },
      fs: {
        mkdir: sinon.stub().resolves(),
        readdir: sinon.stub().resolves([]),
        readFile: sinon.stub().resolves(''),
      },
      fsExtra: {
        rm: sinon.stub().resolves(),
        copy: sinon.stub().resolves(),
      },
      path: {
        join: (...args) => args.join('/'),
        resolve: p => p.startsWith('/') ? p : `/resolved/${p}`,
        basename: p => p.split('/').pop(),
        sep: '/',
      },
      os: {
        platform: sinon.stub().returns('linux'),
        homedir: sinon.stub().returns('/home/user'),
      },
      process: {
        env: {}
      },
      cmUtils: {
        deriveCollectionName: sinon.stub(),
        isValidPluginName: sinon.stub().returns(true),
      },
      yaml: { load: sinon.stub().returns({}) },
      chalk: {
        blue: str => str, yellow: str => str, red: str => str,
        magenta: str => str, green: str => str, underline: str => str,
        greenBright: str => str, blueBright: str => str, gray: str => str,
      }
    };

    const collectionsManagerModule = proxyquire(collectionsIndexPath, {
      'fs': mockDependencies.fss,
      'fs/promises': mockDependencies.fs,
      'fs-extra': mockDependencies.fsExtra,
      'path': mockDependencies.path,
      'os': mockDependencies.os,
      'process': mockDependencies.process,
      '@paths': {
        ...require('@paths'),
        loggerPath: testLoggerPath,
      },
      [cmUtilsPath]: mockDependencies.cmUtils,
    });
    CollectionsManager = collectionsManagerModule;
  });

  afterEach(function() {
    sinon.restore();
  });

  allTestCases.forEach(testCase => {
    const it_ = testCase.only ? it.only : testCase.skip ? it.skip : it;
    const {
      description,
      methodName,
      methodArgs = [],
      managerOptions = {},
      isNegativeTest = false,
      expectedErrorMessage = null,
      stubs = {},
      assertion,
    } = testCase;

    it_(description, async function() {
      const mocks = { mockDependencies };

      if (stubs.fss) {
        if (stubs.fss.existsSync && stubs.fss.existsSync.returns !== undefined)
          mockDependencies.fss.existsSync.returns(stubs.fss.existsSync.returns);

        if (stubs.fss.lstatSync) {
          if (stubs.fss.lstatSync.returns !== undefined) {
            mockDependencies.fss.lstatSync.returns(stubs.fss.lstatSync.returns);
          } else if (stubs.fss.lstatSync.throws) {
            mockDependencies.fss.lstatSync.throws(stubs.fss.lstatSync.throws);
          }
        }
      }
      if (stubs.fs) {
        if(stubs.fs.readdir && stubs.fs.readdir.resolves)
          mockDependencies.fs.readdir.resolves(stubs.fs.readdir.resolves);
        if(stubs.fs.readdir && stubs.fs.readdir.rejects)
          mockDependencies.fs.readdir.rejects(new Error(stubs.fs.readdir.rejects));
      }
      if (stubs.fsExtra && stubs.fsExtra.rm && stubs.fsExtra.rm.rejects) {
        mockDependencies.fsExtra.rm.rejects(new Error(stubs.fsExtra.rm.rejects));
      }
      if (stubs.cmUtils && stubs.cmUtils.deriveCollectionName) {
        mockDependencies.cmUtils.deriveCollectionName.returns(stubs.cmUtils.deriveCollectionName);
      }
      if (stubs.process && stubs.process.env) {
        Object.assign(mockDependencies.process.env, stubs.process.env);
      }
      if (stubs.os) {
        if (stubs.os.platform) mockDependencies.os.platform.returns(stubs.os.platform.returns);
        if (stubs.os.homedir) mockDependencies.os.homedir.returns(stubs.os.homedir.returns);
      }

      const manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT, ...managerOptions }, mockDependencies);

      if (stubs.internal) {
        for (const method of Object.keys(stubs.internal)) {
          mocks[method] = sinon.stub(manager, method);
          if (stubs.internal[method].resolves !== undefined) mocks[method].resolves(stubs.internal[method].resolves);
          if (stubs.internal[method].rejects) mocks[method].rejects(new Error(stubs.internal[method].rejects));
        }
      }

      try {
        let result;
        if (methodName) {
          result = await manager[methodName](...methodArgs);
        } else {
          result = manager;
        }

        if(isNegativeTest) {
          throw new Error('Expected method to throw, but it did not.');
        }

        if (assertion) {
          await assertion(result, mocks, { FAKE_COLL_ROOT }, expect, logs);
        }
      } catch (error) {
        if (!isNegativeTest) {
          throw error;
        }
        expect(error).to.be.an.instanceOf(Error);
        if (expectedErrorMessage instanceof RegExp) {
          expect(error.message).to.match(expectedErrorMessage);
        } else {
          expect(error.message).to.equal(expectedErrorMessage);
        }
      }
    });
  });
});

