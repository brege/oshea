// test/integration/config/main-config-loader.test.1.4.1.js
const { expect } = require('chai');
const path = require('path');
const MainConfigLoader = require('../../../src/config/main_config_loader');
const { defaultConfigPath, factoryDefaultConfigPath } = require('@paths');

describe('MainConfigLoader (1.4.1)', () => {
    describe('constructor', () => {
        const testProjectRoot = '/test/project/root';

        it('1.4.1 Verify the constructor correctly initializes projectRoot, defaultMainConfigPath, and factoryDefaultMainConfigPath based on the provided projectRoot.', () => {
            // Instantiate MainConfigLoader with a mock project root
            const loader = new MainConfigLoader(testProjectRoot);

            // Assert that projectRoot is correctly initialized
            expect(loader.projectRoot).to.equal(testProjectRoot);

            // Assert that defaultMainConfigPath is correctly derived from projectRoot
            expect(loader.defaultMainConfigPath).to.equal(defaultConfigPath);
            // Assert that factoryDefaultMainConfigPath is correctly derived from projectRoot
            expect(loader.factoryDefaultMainConfigPath).to.equal(factoryDefaultConfigPath);
        });
    });
});
