// test/integration/collections/collections-manager.test.js
const {
  collectionsIndexPath,
  cmUtilsPath,
  collectionsConstantsPath
} = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { logs, testLogger, clearLogs } = require('../../shared/capture-logs');

// Import manifests
const addManifest = require('./collections-manager.add.manifest.js');
const removeManifest = require('./collections-manager.remove.manifest.js');
const updateManifest = require('./collections-manager.update.manifest.js');
const listManifest = require('./collections-manager.list.manifest.js');
const enableDisableManifest = require('./collections-manager.enable-disable.manifest.js');

const allTestCases = [
  ...addManifest,
  ...removeManifest,
  ...updateManifest,
  ...listManifest,
  ...enableDisableManifest
];

const FAKE_COLL_ROOT = '/fake/collRoot';

describe('CollectionsManager (Hybrid Integration Tests)', function() {
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
        mkdir: sinon.stub(),
        readdir: sinon.stub(),
        readFile: sinon.stub(),
      },
      fsExtra: {
        rm: sinon.stub(),
        copy: sinon.stub(),
      },
      path: {
        join: (...args) => args.join('/'),
        resolve: p => p.startsWith('/') ? p : `/resolved/${p}`,
        basename: p => p.split('/').pop(),
        sep: '/',
      },
      cmUtils: {
        deriveCollectionName: sinon.stub(),
        isValidPluginName: sinon.stub().returns(true),
      },
      yaml: { load: sinon.stub() },
      constants: require(collectionsConstantsPath),
      logger: testLogger,
      chalk: {
        blue: str => str, yellow: str => str, red: str => str,
        magenta: str => str, green: str => str, underline: str => str,
        greenBright: str => str, blueBright: str => str, gray: str => str,
      }
    };

    // Use absolute paths from @paths for all source dependencies
    const collectionsManagerModule = proxyquire(collectionsIndexPath, {
      'fs': mockDependencies.fss,
      'fs/promises': mockDependencies.fs,
      'fs-extra': mockDependencies.fsExtra,
      'path': mockDependencies.path,
      '@paths': {
        ...require('@paths'),
        logger: testLogger,
        cmUtilsPath,
        collectionsConstantsPath,
        collectionsCommandsRoot: require('@paths').collectionsCommandsRoot,
        validatorPath: require('@paths').validatorPath,
      },
      [cmUtilsPath]: mockDependencies.cmUtils,
      [collectionsConstantsPath]: mockDependencies.constants
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
      methodArgs,
      managerOptions,
      isNegativeTest,
      expectedErrorMessage,
      stubs,
      setup,
      assert,
      useImperativeSetup,
      imperativeSetup,
    } = testCase;

    it_(description, async function() {
      const mocks = { mockDependencies };
      // --- Imperative setup phase: stub dependencies before manager creation ---
      if (useImperativeSetup && typeof imperativeSetup === 'function') {
        imperativeSetup(null, mocks, sinon, expect, testLogger);
      }
      const manager = new CollectionsManager({ collRootFromMainConfig: FAKE_COLL_ROOT, ...managerOptions }, mockDependencies);
      // --- Imperative setup phase: stub internal methods after manager creation ---
      if (useImperativeSetup && typeof imperativeSetup === 'function') {
        imperativeSetup(manager, mocks, sinon, expect, testLogger);
      } else {
        // Factory/manifest-driven setup
        if (stubs && stubs.internal) {
          for (const method of Object.keys(stubs.internal)) {
            mocks[method] = sinon.stub(manager, method);
          }
        }
        setup(mocks);
        if (stubs && stubs.internal) {
          for (const [method, behavior] of Object.entries(stubs.internal)) {
            if (behavior.resolves) mocks[method].resolves(behavior.resolves);
            if (behavior.rejects) mocks[method].rejects(new Error(behavior.rejects));
          }
        }
      }

      if (isNegativeTest) {
        try {
          await manager[methodName](...methodArgs);
          expect.fail('Expected method to throw, but it did not.');
        } catch (error) {
          expect(error).to.be.an.instanceOf(Error);
          if (expectedErrorMessage instanceof RegExp) {
            expect(error.message).to.match(expectedErrorMessage);
          } else {
            expect(error.message).to.equal(expectedErrorMessage);
          }
        }
      } else {
        const result = await manager[methodName](...methodArgs);
        await assert(result, mocks, { FAKE_COLL_ROOT }, expect, logs);
      }
    });
  });
});
