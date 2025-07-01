// test/integration/math_integration/math_integration.test.js
// Test runner for math_integration module integration tests.
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire');

// Import the manifest containing test cases
const testManifest = require('./math_integration.manifest');

describe('math_integration (Module Integration Tests)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockConsoleLog;
    let mockConsoleWarn;
    let mockConsoleError;
    let mockKatexPluginFunction;
    let mockKatexPluginModule;
    let mathIntegrationFactory;

    const commonTestConstants = {
        KATEX_CSS_PATH: path.resolve(__dirname, '../../../assets/css/katex.min.css'),
    };

    beforeEach(function() {
        // Clear module cache for math_integration module.
        delete require.cache[require.resolve('../../../src/core/math_integration')];

        mockFsPromises = { readFile: sinon.stub(), };
        mockFsSync = { existsSync: sinon.stub().returns(false), statSync: sinon.stub(), };
        mockPath = {
            resolve: sinon.stub().callsFake((...args) => require('path').resolve(...args)),
            join: sinon.stub().callsFake((...args) => require('path').join(...args)),
            basename: require('path').basename,
            dirname: require('path').dirname,
        };

        mockConsoleLog = sinon.stub(console, 'log').callThrough();
        mockConsoleWarn = sinon.stub(console, 'warn').callThrough();
        mockConsoleError = sinon.stub(console, 'error').callThrough();

        mockKatexPluginFunction = sinon.stub();
        mockKatexPluginModule = { default: mockKatexPluginFunction };

        // Get the createMathIntegration factory function using proxyquire
        mathIntegrationFactory = proxyquire(path.resolve(__dirname, '../../../src/core/math_integration'), {
            // Stub the internal require('@vscode/markdown-it-katex') inside the factory function
            '@vscode/markdown-it-katex': mockKatexPluginModule,
            // No need to stub fs, fs/promises, path here, as they are now injected into the factory function itself.
        });

        // Instantiate mathIntegration with default (passing) dependencies for general tests.
        // Individual test cases in the manifest can create new instances with different mocks.
        this.mathIntegration = mathIntegrationFactory({
            fsPromises: mockFsPromises,
            fsSync: mockFsSync,
            path: mockPath,
        });

        this.mocks = {
            mockFsPromises, mockFsSync, mockPath,
            mockConsoleLog, mockConsoleWarn, mockConsoleError,
            mockKatexPluginFunction,
            mockKatexPluginModule, // This is the default mock module for katex
            mathIntegration: this.mathIntegration, // Default passing instance of mathIntegration module
            mathIntegrationFactory: mathIntegrationFactory // Provide the factory for test cases to create custom instances
        };

    });

    afterEach(function() {
        sinon.restore();
        // Clear require cache for the module under test and its immediate dependencies
        delete require.cache[require.resolve('../../../src/core/math_integration')];
        if (console.lastLog !== undefined) {
             console.lastLog = "";
        }
    });

    testManifest.forEach(testCase => {
        const it_ = (testCase.test_id === '1.7.4') ? it.skip : (testCase.only ? it.only : testCase.skip ? it.skip : it);

        it_(`${testCase.test_id}: ${testCase.describe}`, async function() {
            if (testCase.setup) {
                await testCase.setup(this.mocks, commonTestConstants);
            }

            await testCase.assert(this.mocks, commonTestConstants, expect);

            if (testCase.teardown) {
                await testCase.teardown(this.mocks, commonTestConstants);
            }
        });
    });
});
