// test/integration/core/math_integration.factory.js
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire');


function makeMathIntegrationScenario({
  testId,
  description,
  scenario = {},
  assertion,
  only,
  skip,
}) {
  return { testId, description, scenario, assertion, only, skip };
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

  // Math config
  const mathConfig = scenario.mathConfig !== undefined
    ? scenario.mathConfig
    : { enabled: true, engine: 'katex', katex_options: { throwOnError: false } };

  // CSS file existence/content/error simulation
  const cssExists = scenario.cssExists !== undefined ? scenario.cssExists : false;
  const cssContent = scenario.cssContent !== undefined ? scenario.cssContent : '';
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

  // KaTeX plugin stub: simulate valid, missing, or invalid plugin
  let mockKatexPluginFunction = sinon.stub();
  let mockKatexPluginModule;
  if (scenario.katexPluginModule === null) {
    // Simulate require failure or invalid plugin (not a function, no .default)
    mockKatexPluginModule = {};
  } else if (scenario.katexPluginModule !== undefined) {
    mockKatexPluginModule = scenario.katexPluginModule;
  } else {
    mockKatexPluginModule = { default: mockKatexPluginFunction };
  }

  // Proxyquire mathIntegration with loggerPath for log capturing
  const mathIntegrationFactory = proxyquire('../../../src/core/math_integration', {
    '@vscode/markdown-it-katex': mockKatexPluginModule,
    '@paths': { loggerPath: constants.TEST_LOGGER_PATH },
  });

  const mathIntegration = mathIntegrationFactory({
    fsPromises: mockFsPromises,
    fsSync: mockFsSync,
    path: mockPath,
    katexPluginModule: mockKatexPluginModule,
  });

  // Markdown-it instance (always stubbed for use assertions)
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
