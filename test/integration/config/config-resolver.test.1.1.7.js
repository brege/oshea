// test/integration/config/config-resolver.test.1.1.7.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../../src/config/ConfigResolver');

// Test suite for Scenario 1.1.7
describe('ConfigResolver getEffectiveConfig (1.1.7)', () => {

    it('should throw an error if a path-specified plugin is neither a file nor a directory', async () => {
        // Arrange
        const WEIRD_PATH = '/fake/path/to/a-socket-or-something';
        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                sep: '/',
                isAbsolute: sinon.stub().returns(true),
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ 
                    isDirectory: () => false, 
                    isFile: () => false 
                }),
                readFileSync: sinon.stub().returns('{}')
            }
        };

        const resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();

        // Act & Assert
        try {
            await resolver.getEffectiveConfig(WEIRD_PATH);
            expect.fail('Expected getEffectiveConfig to throw an error, but it did not.');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(`Plugin path specification '${WEIRD_PATH}' is neither a file nor a directory.`);
        }
    });
});
