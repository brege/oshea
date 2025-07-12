> **Historical Note:** These items are paused until the repo is in a more stable state of refactoring towards a central logger.

### **Integration Tests**

#### Path/Env/Initialization (`constructor`)
- 2.1.1: should use XDG_DATA_HOME for collRoot if the environment variable is set
- 2.1.1: should use the Linux/macOS default path when XDG_DATA_HOME is not set
- 2.1.1: should use the Windows default path when XDG_DATA_HOME is not set and platform is win32
- 2.1.2: should prioritize collRootCliOverride over all other path settings

#### Collection Operations (`addCollection`)
- 2.1.5: should throw an error when cloning from an invalid Git URL

#### Plugin Disable/Remove (`disablePlugin`)
- 2.1.22: should successfully remove a plugin from the enabled manifest
- 2.1.23: should gracefully handle attempts to disable a non-existent invokeName

#### Plugin/Collection Listing/Aggregation (`listCollections`, `listAvailablePlugins`)
- 2.1.13: should list all collections found as directories in the collection root
- 2.1.14: should return a list of all enabled plugins when filter is 'enabled'
- 2.1.14: should correctly filter the enabled plugins by collection name when provided
- 2.1.15: should return a list of all enabled plugins when filter is 'enabled'
- 2.1.15: should correctly filter the enabled plugins by collection name when provided
- 2.1.24: should correctly scan all collections and aggregate available plugins
- 2.1.25: should correctly filter results when a collectionName is provided

#### Collection/Plugin Directory Edge Cases (`listAvailablePlugins`)
- 2.1.26: should return an empty array for a collection with no valid plugin config files
- 2.1.27: should throw an error if a collection directory is unreadable
- 2.1.28: should correctly extract the description from a plugin config file
- 2.1.28: should provide a default description if one is not available in the config
