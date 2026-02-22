// test/runners/integration/core/math-integration.manifest.js
require('module-alias/register');
const { mathIntegrationFactoryPath } = require('@paths');
const { makeMathIntegrationScenario } = require(mathIntegrationFactoryPath);

module.exports = [
  makeMathIntegrationScenario({
    test_id: '1.7.1',
    description: 'applies the KaTeX plugin when math is enabled',
    scenario: {
      mathConfig: {
        enabled: true,
        engine: 'katex',
        katex_options: { throwOnError: false, trust: false },
      },
    },
    assertion: async (mocks, constants, expect, logs) => {
      const {
        mathIntegration,
        mdInstance,
        mathConfig,
        mockKatexPluginFunction,
      } = mocks;
      mathIntegration.configureMarkdownItForMath(mdInstance, mathConfig);
      expect(mdInstance.use.calledOnce).to.be.true;
      expect(
        mdInstance.use.calledWith(
          mockKatexPluginFunction,
          mathConfig.katex_options,
        ),
      ).to.be.true;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.2',
    description: 'passes katex_options to the KaTeX plugin',
    scenario: {
      mathConfig: {
        enabled: true,
        engine: 'katex',
        katex_options: {
          throwOnError: true,
          displayMode: true,
          macros: { '\\myMacro': 'macroValue' },
        },
      },
    },
    assertion: async (mocks, constants, expect, logs) => {
      const {
        mathIntegration,
        mdInstance,
        mathConfig,
        mockKatexPluginFunction,
      } = mocks;
      mathIntegration.configureMarkdownItForMath(mdInstance, mathConfig);
      expect(mdInstance.use.calledOnce).to.be.true;
      expect(
        mdInstance.use.calledWith(
          mockKatexPluginFunction,
          mathConfig.katex_options,
        ),
      ).to.be.true;
      expect(mdInstance.use.getCall(0).args[1]).to.deep.equal(
        mathConfig.katex_options,
      );
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.3',
    description: 'does nothing if math is not enabled or engine is not "katex"',
    scenario: {
      mathConfig: { enabled: false, engine: 'katex' },
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration, mdInstance } = mocks;
      mathIntegration.configureMarkdownItForMath(mdInstance, {
        enabled: false,
        engine: 'katex',
      });
      expect(mdInstance.use.called).to.be.false;
      mathIntegration.configureMarkdownItForMath(mdInstance, {
        enabled: true,
        engine: 'other_engine',
      });
      expect(mdInstance.use.called).to.be.false;
      mathIntegration.configureMarkdownItForMath(mdInstance, null);
      expect(mdInstance.use.called).to.be.false;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.5',
    description: 'returns CSS content when file exists',
    scenario: {
      mathConfig: { enabled: true, engine: 'katex' },
      cssExists: true,
      cssContent: '/* mock css */',
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration, mathConfig, mockFsSync, mockFsPromises } = mocks;
      const result = await mathIntegration.getMathCssContent(mathConfig);
      expect(mockFsSync.existsSync.calledWith(constants.KATEX_CSS_PATH)).to.be
        .true;
      expect(
        mockFsPromises.readFile.calledWith(constants.KATEX_CSS_PATH, 'utf8'),
      ).to.be.true;
      expect(result).to.deep.equal(['/* mock css */']);
      expect(
        logs.some(
          (l) => l.level === 'debug' && l.msg === 'Checking for KaTeX CSS',
        ),
      ).to.be.true;
      expect(logs.some((l) => l.level === 'warn')).to.be.false;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.6',
    description:
      'returns empty array if math is not enabled or engine is not "katex"',
    scenario: {
      mathConfig: { enabled: false, engine: 'katex' },
      cssExists: false,
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration } = mocks;
      const result1 = await mathIntegration.getMathCssContent({
        enabled: false,
        engine: 'katex',
      });
      expect(result1).to.deep.equal([]);
      const result2 = await mathIntegration.getMathCssContent({
        enabled: true,
        engine: 'other_engine',
      });
      expect(result2).to.deep.equal([]);
      const result3 = await mathIntegration.getMathCssContent(null);
      expect(result3).to.deep.equal([]);
      expect(logs.some((l) => l.level === 'warn')).to.be.false;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.7',
    description:
      'returns empty array and logs warning if CSS file does not exist',
    scenario: {
      mathConfig: { enabled: true, engine: 'katex' },
      cssExists: false,
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration, mathConfig, mockFsSync } = mocks;
      const result = await mathIntegration.getMathCssContent(mathConfig);
      expect(mockFsSync.existsSync.calledWith(constants.KATEX_CSS_PATH)).to.be
        .true;
      expect(result).to.deep.equal([]);
      expect(
        logs.some(
          (l) =>
            l.level === 'warn' &&
            l.msg === 'KaTeX CSS file not found' &&
            l.data.resource === constants.KATEX_CSS_PATH,
        ),
      ).to.be.true;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.8',
    description:
      'returns empty array and logs warning if error reading CSS file',
    scenario: {
      mathConfig: { enabled: true, engine: 'katex' },
      cssExists: true,
      cssReadError: 'Permission denied',
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration, mathConfig, mockFsSync, mockFsPromises } = mocks;
      const result = await mathIntegration.getMathCssContent(mathConfig);
      expect(mockFsSync.existsSync.calledWith(constants.KATEX_CSS_PATH)).to.be
        .true;
      expect(
        mockFsPromises.readFile.calledWith(constants.KATEX_CSS_PATH, 'utf8'),
      ).to.be.true;
      expect(result).to.deep.equal([]);
      expect(
        logs.some(
          (l) =>
            l.level === 'warn' &&
            l.msg === 'Could not read KaTeX CSS file' &&
            l.data.error === 'Permission denied',
        ),
      ).to.be.true;
      expect(logs.some((l) => l.level === 'error')).to.be.false;
    },
  }),

  makeMathIntegrationScenario({
    test_id: '1.7.4',
    description:
      'logs an error and returns if @vscode/markdown-it-katex cannot be required or is not a valid plugin function',
    scenario: {
      katexPluginModule: null,
    },
    assertion: async (mocks, constants, expect, logs) => {
      const { mathIntegration, mdInstance, mathConfig } = mocks;
      mathIntegration.configureMarkdownItForMath(mdInstance, mathConfig);

      expect(mdInstance.use.called).to.be.false;

      expect(
        logs.some(
          (l) =>
            l.level === 'error' &&
            l.msg === 'KaTeX plugin is not a function' &&
            l.data.context === 'MathIntegration' &&
            l.data.error.includes(
              'Resolved KaTeX plugin or its .default is not a function',
            ),
        ),
      ).to.be.true;
    },
  }),
];
