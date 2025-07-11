// test/integration/collections/collections-manager.list.manifest.js
const { makeCollectionsManagerScenario } = require('./collections-manager.factory');

const FAKE_ENABLED_PLUGINS = [
  { invoke_name: 'plugin-a', collection_name: 'collection-1' },
  { invoke_name: 'plugin-c', collection_name: 'collection-1' },
  { invoke_name: 'plugin-b', collection_name: 'collection-2' },
];

module.exports = [
  makeCollectionsManagerScenario({
    description: '2.1.13: should list all downloaded collections from the file system',
    methodName: 'listCollections',
    methodArgs: ['downloaded'],
    stubs: {
      fss: { existsSync: { returns: true } },
      fs: {
        readdir: {
          resolves: [
            { name: 'collection-a', isDirectory: () => true },
            { name: 'collection-b', isDirectory: () => true },
            { name: 'a-file.txt', isDirectory: () => false },
          ]
        }
      },
      internal: {
        _readCollectionMetadata: { resolves: { name: 'stub-name', source: 'stub-source' } },
      },
    },
    assertion: (result, mocks, constants, expect) => {
      mocks._readCollectionMetadata.withArgs('collection-a').resolves({ name: 'collection-a', source: 'https://a.com' });
      mocks._readCollectionMetadata.withArgs('collection-b').resolves({ name: 'collection-b', source: 'https://b.com' });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result.map(r => r.name)).to.deep.equal(['collection-a', 'collection-b']);
      expect(mocks._readCollectionMetadata.calledTwice).to.be.true;
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.14 & 2.1.15: should list all enabled plugins, sorted by invoke_name',
    methodName: 'listCollections',
    methodArgs: ['enabled'],
    stubs: {
      fss: { existsSync: { returns: true } }, // for is_original_source_missing check
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: FAKE_ENABLED_PLUGINS } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(3);
      // The list method sorts them, so 'plugin-a' should be first.
      expect(result[0].invoke_name).to.equal('plugin-a');
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.15: should filter enabled plugins by collection name',
    methodName: 'listCollections',
    methodArgs: ['enabled', 'collection-1'],
    stubs: {
      fss: { existsSync: { returns: true } },
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: FAKE_ENABLED_PLUGINS } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result.every(p => p.collection_name === 'collection-1')).to.be.true;
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.16: should return empty array for "downloaded" if collection root does not exist',
    methodName: 'listCollections',
    methodArgs: ['downloaded'],
    stubs: {
      fss: { existsSync: { returns: false } },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
      expect(mocks.mockDependencies.fs.readdir.called).to.be.false;
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.16: should return empty array for "enabled" if manifest is missing or empty',
    methodName: 'listCollections',
    methodArgs: ['enabled'],
    stubs: {
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: [] } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.26: should handle empty or invalid collections gracefully',
    methodName: 'listAvailablePlugins',
    methodArgs: ['empty-collection'],
    stubs: {
      fs: { readdir: { resolves: [] } }
    },
    setup: (mocks) => {
      const { FAKE_COLL_ROOT } = { FAKE_COLL_ROOT: '/fake/collRoot' };
      mocks.mockDependencies.fss.existsSync.withArgs(`${FAKE_COLL_ROOT}/empty-collection`).returns(true);
      mocks.mockDependencies.fss.lstatSync.withArgs(`${FAKE_COLL_ROOT}/empty-collection`).returns({ isDirectory: () => true });
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
    }
  }),
];
