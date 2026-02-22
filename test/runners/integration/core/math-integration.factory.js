// test/runners/integration/core/math-integration.factory.js
require('module-alias/register');
const sinon = require('sinon');
const path = require('node:path');
const proxyquire = require('proxyquire');
const { mathIntegrationPath } = require('@paths');

function makeMathIntegrationScenario({
  test_id, // eslint-disable-line camelcase
  description,
  scenario = {},
  assertion,
  only,
  skip,
}) {
  // eslint-disable-next-line camelcase
  return { test_id, description, scenario, assertion, only, skip };
}

function buildMocks(scenario, constants) {
  // FS and path stubs
  const mockFsPromises = { readFile: sinon.stub() };
  const mockFsSync = { existsSync: sinon.stub(), statSync: sinon.stub() };
  const mockPath = {
    resolve: sinon.stub().callsFake((...args) => path.resolve(...args)),
    join: sinon.stub().callsFake((...args) => path.join(...args)),
    basename: path.basename,
    dirname: path.dirname,
  };

  const mathConfig =
    scenario.mathConfig !== undefined
      ? scenario.mathConfig
      : {
          enabled: true,
          engine: 'katex',
          katex_options: { throwOnError: false },
        };

  const cssExists =
    scenario.cssExists !== undefined ? scenario.cssExists : false;
  const cssContent =
    scenario.cssContent !== undefined ? scenario.cssContent : '';
  if (cssExists) {
    mockFsSync.existsSync.withArgs(constants.KATEX_CSS_PATH).returns(true);
    if (scenario.cssReadError) {
      mockFsPromises.readFile.rejects(new Error(scenario.cssReadError));
    } else {
      mockFsPromises.readFile.resolves(cssContent);
    }
  } else {
    mockFsSync.existsSync.withArgs(constants.KATEX_CSS_PATH).returns(false);
    mockFsPromises.readFile.resolves('');
  }

  const mockKatexPluginFunction = sinon.stub();
  let mockKatexPluginModule;
  if (scenario.katexPluginModule === null) {
    mockKatexPluginModule = {};
  } else if (scenario.katexPluginModule !== undefined) {
    mockKatexPluginModule = scenario.katexPluginModule;
  } else {
    mockKatexPluginModule = { default: mockKatexPluginFunction };
  }

  const mathIntegrationFactory = proxyquire(mathIntegrationPath, {
    '@vscode/markdown-it-katex': mockKatexPluginModule,
    '@paths': { loggerPath: constants.TEST_LOGGER_PATH },
  });

  const mathIntegration = mathIntegrationFactory({
    fsPromises: mockFsPromises,
    fsSync: mockFsSync,
    path: mockPath,
    katexPluginModule: mockKatexPluginModule,
  });

  const mdInstance = scenario.mdInstance || {
    use: sinon.stub(),
    render: sinon.stub().returns(''),
  };

  return {
    mathIntegration,
    mdInstance,
    mathConfig,
    mockFsPromises,
    mockFsSync,
    mockPath,
    mockKatexPluginFunction,
    mockKatexPluginModule,
  };
}

module.exports = { makeMathIntegrationScenario, buildMocks };
