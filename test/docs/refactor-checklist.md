> **Historical Note:** These items are paused until the repos is in a more stable state of refactoring towards a central logger.

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


#### **Summary Table: Missing/Unimplemented Tests**

Thank you for clarifying! Here is the summary as you requested, with **three columns**:

| Test Code | Command/Function      | Description |
|-----------|----------------------|-------------|
| 2.1.1     | constructor          | should use XDG_DATA_HOME for collRoot if the environment variable is set |
| 2.1.1     | constructor          | should use the Linux/macOS default path when XDG_DATA_HOME is not set |
| 2.1.1     | constructor          | should use the Windows default path when XDG_DATA_HOME is not set and platform is win32 |
| 2.1.2     | constructor          | should prioritize collRootCliOverride over all other path settings |
| 2.1.5     | addCollection        | should throw an error when cloning from an invalid Git URL |
| 2.1.13    | listCollections      | should list all collections found as directories in the collection root |
| 2.1.14    | listCollections      | should return a list of all enabled plugins when filter is 'enabled' |
| 2.1.14    | listCollections      | should correctly filter the enabled plugins by collection name when provided |
| 2.1.15    | listCollections      | should return a list of all enabled plugins when filter is 'enabled' |
| 2.1.15    | listCollections      | should correctly filter the enabled plugins by collection name when provided |
| 2.1.22    | disablePlugin        | should successfully remove a plugin from the enabled manifest |
| 2.1.23    | disablePlugin        | should gracefully handle attempts to disable a non-existent invokeName |
| 2.1.24    | listAvailablePlugins | should correctly scan all collections and aggregate available plugins |
| 2.1.25    | listAvailablePlugins | should correctly filter results when a collectionName is provided |
| 2.1.26    | listAvailablePlugins | should return an empty array for a collection with no valid plugin config files |
| 2.1.27    | listAvailablePlugins | should throw an error if a collection directory is unreadable |
| 2.1.28    | listAvailablePlugins | should correctly extract the description from a plugin config file |
| 2.1.28    | listAvailablePlugins | should provide a default description if one is not available in the config |


### **E2E Tests**

#### Collection Add (`collection add`)
- 3.10.3: (Sad Path) Fails with a non-zero exit code when the source is invalid

#### Convert (`convert`)
- 3.1.6: (Sad Path) Fails with a non-zero exit code when the input file does not exist
- 3.1.7: (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified

#### Generate (`generate`)
- 3.2.2: (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing

#### Global Flags (`global flags`)
- 3.15.3: (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message

#### Plugin Disable (`plugin disable`)
- 3.8.1: (Happy Path) Successfully disables an enabled plugin

#### Plugin Enable (`plugin enable`)
- 3.7.3: (Sad Path) The `plugin enable` command fails to enable an invalid plugin and reports validation errors

#### Plugin Validate (`plugin validate`)
- 3.9.2: (Sad Path) Fails validation for a poorly-formed plugin directory

#### Sad Paths
- 4.3.2: (Sad Path) `plugin create --from` fails with invalid source
- 4.3.1: (Sad Path) `collection update` fails with local uncommitted changes

#### Full User Workflow (Lifecycle)
- 4.1.1: should handle the full lifecycle of adding, enabling, using, disabling, and removing a plugin collection
