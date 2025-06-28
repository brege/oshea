// test/integration/collections/collections-manager.test.2.1.2.js
const { expect } = require('chai');
const sinon = require('sinon');
const CollectionsManager = require('../../../src/collections');

// Test suite for Scenario 2.1.2
describe('CollectionsManager Constructor Path Initialization (2.1.2)', () => {

    it('should prioritize collRootCliOverride over all other path settings', () => {
        // Arrange
        const cliOverridePath = '/fake/cli_override_path';

        // Set up mock dependencies with conflicting path information
        // that should all be ignored in favor of the CLI override.
        const mockDependencies = {
            process: {
                env: {
                    'MD_TO_PDF_COLL_ROOT_TEST_OVERRIDE': '/ignored/test_override',
                    'MD_TO_PDF_COLLECTIONS_ROOT': '/ignored/env_var',
                    'XDG_DATA_HOME': '/ignored/xdg_home'
                }
            },
            os: {
                platform: sinon.stub().returns('linux'),
                homedir: sinon.stub().returns('/ignored/home')
            },
            path: {
                join: (...args) => args.join('/')
            },
            chalk: {
                magenta: str => str,
                yellowBright: str => str,
            }
        };

        const options = {
            collRootCliOverride: cliOverridePath,
            collRootFromMainConfig: '/ignored/config_path' // Also ignored
        };

        // Act
        const manager = new CollectionsManager(options, mockDependencies);

        // Assert
        expect(manager.collRoot).to.equal(cliOverridePath);
    });
});
