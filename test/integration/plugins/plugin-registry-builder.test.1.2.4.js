// test/integration/plugins/plugin-registry-builder.test.1.2.4.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.4
describe('PluginRegistryBuilder _resolveAlias (1.2.4)', () => {

    let mockDependencies;
    let builderInstance;
    const FAKE_HOMEDIR = '/fake/user/home';
    const TEST_ALIAS_VALUE = '~/my-custom-dir/plugin';
    const EXPECTED_RESOLVED_PATH = `${FAKE_HOMEDIR}/my-custom-dir/plugin`;

    beforeEach(() => {
        // Create a fresh set of mock dependencies for each test
        mockDependencies = {
            fs: {
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ isFile: () => true, isDirectory: () => false }),
                readdirSync: sinon.stub().returns([])
            },
            fsPromises: {
                readFile: sinon.stub().resolves('{}')
            },
            path: {
                join: sinon.stub().callsFake((...args) => args.join('/')),
                resolve: sinon.stub().callsFake((...args) => args.join('/')),
                isAbsolute: sinon.stub().returns(true),
                dirname: sinon.stub().returns('/fake/dir'),
                basename: sinon.stub().returns('file.yaml'),
                extname: sinon.stub().returns('.yaml')
            },
            os: {
                homedir: sinon.stub().returns(FAKE_HOMEDIR),
                platform: sinon.stub().returns('linux')
            },
            loadYamlConfig: sinon.stub().resolves({}),
            yaml: {
                load: sinon.stub().returns({})
            },
            process: {
                env: { XDG_CONFIG_HOME: '/fake/xdg/config', ...process.env },
                cwd: sinon.stub().returns('/fake/cwd')
            },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

        // Initialize PluginRegistryBuilder with specific mocks
        builderInstance = new PluginRegistryBuilder(
            '/fake/project/root',
            null,
            null,
            false,
            false,
            null,
            null,
            mockDependencies
        );

        // Reset the spy's call history AFTER the constructor runs,
        // so we only count calls from the method under test.
        mockDependencies.os.homedir.resetHistory();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should resolve a tilde-prefixed alias value to an absolute path in the user\'s home directory', () => {
        // Arrange
        const aliasName = 'myAlias';
        const basePathDefiningAlias = '/fake/config-base';

        // Act
        // Call the private method _resolveAlias directly
        const resolvedPath = builderInstance._resolveAlias(aliasName, TEST_ALIAS_VALUE, basePathDefiningAlias);

        // Assert
        expect(mockDependencies.os.homedir.calledOnce).to.be.true;
        expect(resolvedPath).to.equal(EXPECTED_RESOLVED_PATH);
    });
});
