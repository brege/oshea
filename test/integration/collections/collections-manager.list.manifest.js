// test/integration/collections/collections-manager.list.manifest.js
require('module-alias/register');
const { collectionsManagerFactoryPath } = require('@paths');
const { makeCollectionsManagerScenario } = require(collectionsManagerFactoryPath);

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
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
      fs: {
        readdir: {
          resolves: [
            { name: 'collection-a', isDirectory: () => true },
            { name: 'collection-b', isDirectory: () => true },
            { name: 'a-file.txt', isDirectory: () => false },
            { name: '_user_added_plugins', isDirectory: () => false }
          ]
        }
      },
      internal: {
        _readCollectionMetadata: { resolves: { name: 'stub-name', source: 'stub-source' } },
      },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result.map(r => r.name)).to.deep.equal(['collection-a', 'collection-b']);
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.14 & 2.1.15: should list all enabled plugins, sorted by invoke_name',
    methodName: 'listCollections',
    methodArgs: ['enabled'],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
      internal: {
        _readEnabledManifest: { resolves: { enabled_plugins: FAKE_ENABLED_PLUGINS } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(3);
      expect(result[0].invoke_name).to.equal('plugin-a');
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.14 & 2.1.15: should correctly filter the enabled plugins by collection name when provided',
    methodName: 'listCollections',
    methodArgs: ['enabled', 'collection-1'],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
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
    description: '2.1.16: should return an empty array for \'downloaded\' type if the collection root does not exist',
    methodName: 'listCollections',
    methodArgs: ['downloaded'],
    stubs: {
      fss: { existsSync: { returns: false } }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
      if (mocks.mockDependencies && mocks.mockDependencies.fs && mocks.mockDependencies.fs.readdir) {
        expect(mocks.mockDependencies.fs.readdir.called).to.be.false;
      }
    }
  }),

  makeCollectionsManagerScenario({
    description: '2.1.16: should return an empty array for \'enabled\' type if the enabled manifest is missing or empty',
    methodName: 'listCollections',
    methodArgs: ['enabled'],
    stubs: {
      fss: { existsSync: { returns: true } },
      internal: { _readEnabledManifest: { resolves: { enabled_plugins: [] } } }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
      if (mocks._readEnabledManifest) {
        expect(mocks._readEnabledManifest.called).to.be.true;
      }
    }
  }),

  makeCollectionsManagerScenario({
    description: '2.1.24 & 2.1.25: should scan and filter available plugins',
    methodName: 'listAvailablePlugins',
    methodArgs: ['collection-a'],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
      fs: {
        readdir: { resolves: [{ name: 'plugin-1', isDirectory: () => true }] },
        readFile: { resolves: 'description: Plugin 1' }
      },
      yaml: { load: { returns: { description: 'Plugin 1' } } },
      internal: { _readCollectionMetadata: { resolves: { name: 'plugin-1' } } }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].plugin_id).to.equal('plugin-1');
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.24: should correctly scan all collections and aggregate available plugins',
    methodName: 'listAvailablePlugins',
    methodArgs: [],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: {
          returns: { isDirectory: () => true, isFile: () => false }
        }
      },
      fs: {
        readdir: {
          resolves: [
            { name: 'collection-a', isDirectory: () => true },
            { name: 'collection-b', isDirectory: () => true }
          ]
        },
      },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').with.lengthOf(2);
    }
  }),

  makeCollectionsManagerScenario({
    description: '2.1.26: should return an empty array for a collection with no valid plugin config files',
    methodName: 'listAvailablePlugins',
    methodArgs: ['empty-collection'],
    stubs: {
      fs: { readdir: { resolves: [] } },
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.26: should return an empty array for a collection with no directories containing valid plugin config files',
    methodName: 'listAvailablePlugins',
    methodArgs: ['no-plugins-collection'],
    stubs: {
      fs: {
        readdir: { resolves: [ { name: 'not-a-plugin', isDirectory: () => true } ] }
      },
      fss: {
        existsSync: { returns: false }, // No config files are found
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      }
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result).to.be.an('array').that.is.empty;
    }
  }),

  makeCollectionsManagerScenario({
    description: '2.1.27: should throw an error if a collection directory is unreadable',
    methodName: 'listAvailablePlugins',
    methodArgs: ['unreadable-collection'],
    isNegativeTest: true,
    expectedErrorMessage: /EACCES: permission denied/,
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { throws: new Error('EACCES: permission denied') }
      },
      fs: { readdir: { rejects: new Error('EACCES: permission denied') } }
    },
  }),
  makeCollectionsManagerScenario({
    description: '2.1.28: should correctly extract the description from a plugin config file',
    methodName: 'listAvailablePlugins',
    methodArgs: ['collection-with-desc'],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
      fs: {
        readdir: { resolves: [{ name: 'plugin-with-desc', isDirectory: () => true }] },
        readFile: { resolves: 'description: My Test Plugin' }
      },
      yaml: { load: { returns: { description: 'My Test Plugin' } } },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result[0].description).to.equal('My Test Plugin');
    }
  }),
  makeCollectionsManagerScenario({
    description: '2.1.28: should provide a default description if one is not available in the config',
    methodName: 'listAvailablePlugins',
    methodArgs: ['collection-no-desc'],
    stubs: {
      fss: {
        existsSync: { returns: true },
        lstatSync: { returns: { isDirectory: () => true, isFile: () => false } }
      },
      fs: {
        readdir: { resolves: [{ name: 'plugin-no-desc', isDirectory: () => true }] },
        readFile: { resolves: 'version: 1.0' }
      },
      yaml: { load: { returns: { version: '1.0' } } },
    },
    assertion: (result, mocks, constants, expect) => {
      expect(result[0].description).to.equal('Plugin description not available.');
    }
  }),
];

