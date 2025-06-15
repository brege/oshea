* [x] 1.1.1 Verify that `_initializeResolverIfNeeded` correctly loads and merges primary, XDG, and project main configurations, and sets `primaryMainConfig`, `primaryMainConfigPathActual`, and `resolvedCollRoot`.
  - **test_id:** 1.1.1
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify that `_initializeResolverIfNeeded` correctly loads and merges primary, XDG, and project main configurations, and sets `primaryMainConfig`, `primaryMainConfigPathActual`, and `resolvedCollRoot`.
* [ ] 1.1.2 Test that `_initializeResolverIfNeeded` correctly rebuilds the `mergedPluginRegistry` when `useFactoryDefaultsOnly` or `isLazyLoadMode` changes, or when `primaryMainConfigLoadReason` changes.
  - **test_id:** 1.1.2
  - **status:** OPEN
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test that `_initializeResolverIfNeeded` correctly rebuilds the `mergedPluginRegistry` when `useFactoryDefaultsOnly` or `isLazyLoadMode` changes, or when `primaryMainConfigLoadReason` changes.
* [x] 1.1.3 Test `_loadPluginBaseConfig` for a valid plugin config file, ensuring it loads the raw YAML and resolves initial CSS paths, returning `rawConfig`, `resolvedCssPaths`, `inherit_css`, and `actualPath`.
  - **test_id:** 1.1.3
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_loadPluginBaseConfig` for a valid plugin config file, ensuring it loads the raw YAML and resolves initial CSS paths, returning `rawConfig`, `resolvedCssPaths`, `inherit_css`, and `actualPath`.
* [x] 1.1.4 Test `getEffectiveConfig` with a registered plugin name, ensuring it resolves the correct `pluginOwnConfigPath` and `actualPluginBasePath` from the `mergedPluginRegistry`.
  - **test_id:** 1.1.4
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getEffectiveConfig` with a registered plugin name, ensuring it resolves the correct `pluginOwnConfigPath` and `actualPluginBasePath` from the `mergedPluginRegistry`.
* [x] 1.1.5 Verify `getEffectiveConfig` correctly handles a plugin specified by an absolute directory path, identifying its config file (`.config.yaml`).
  - **test_id:** 1.1.5
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getEffectiveConfig` correctly handles a plugin specified by an absolute directory path, identifying its config file (`.config.yaml`).
* [x] 1.1.6 Verify `getEffectiveConfig` correctly handles a plugin specified by an absolute file path to its config file.
  - **test_id:** 1.1.6
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getEffectiveConfig` correctly handles a plugin specified by an absolute file path to its config file.
* [x] 1.1.7 Test `getEffectiveConfig` throws an error if a path-specified plugin is neither a file nor a directory.
  - **test_id:** 1.1.7
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getEffectiveConfig` throws an error if a path-specified plugin is neither a file nor a directory.
* [x] 1.1.8 Test `getEffectiveConfig` throws an error if a registered plugin's `configPath` does not exist at the registered path.
  - **test_id:** 1.1.8
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getEffectiveConfig` throws an error if a registered plugin's `configPath` does not exist at the registered path.
* [x] 1.1.9 Ensure `getEffectiveConfig` correctly applies XDG, Local (plugin file), and Project overrides by `pluginConfigLoader.applyOverrideLayers`.
  - **test_id:** 1.1.9
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Ensure `getEffectiveConfig` correctly applies XDG, Local (plugin file), and Project overrides by `pluginConfigLoader.applyOverrideLayers`.
* [x] 1.1.10 Test `getEffectiveConfig` applies `localConfigOverrides` (from front matter or local config) on top of existing configurations, including `css_files` resolution relative to `markdownFilePath`.
  - **test_id:** 1.1.10
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getEffectiveConfig` applies `localConfigOverrides` (from front matter or local config) on top of existing configurations, including `css_files` resolution relative to `markdownFilePath`.
* [x] 1.1.11 Ensure `getEffectiveConfig` merges `primaryMainConfig.global_pdf_options` into `pluginSpecificConfig.pdf_options` correctly, including nested `margin` properties.
  - **test_id:** 1.1.11
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Ensure `getEffectiveConfig` merges `primaryMainConfig.global_pdf_options` into `pluginSpecificConfig.pdf_options` correctly, including nested `margin` properties.
* [x] 1.1.12 Verify `getEffectiveConfig` merges `primaryMainConfig.math` and `pluginSpecificConfig.math` correctly, including `katex_options`.
  - **test_id:** 1.1.12
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getEffectiveConfig` merges `primaryMainConfig.math` and `pluginSpecificConfig.math` correctly, including `katex_options`.
* [x] 1.1.13 Test `getEffectiveConfig` correctly consolidates and filters `css_files` paths, ensuring only existing and unique paths are included.
  - **test_id:** 1.1.13
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getEffectiveConfig` correctly consolidates and filters `css_files` paths, ensuring only existing and unique paths are included.
* [x] 1.1.14 Verify `getEffectiveConfig` throws an error if the `handler_script` specified in the plugin's configuration does not exist at the resolved `handlerScriptPath`.
  - **test_id:** 1.1.14
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getEffectiveConfig` throws an error if the `handler_script` specified in the plugin's configuration does not exist at the resolved `handlerScriptPath`.
* [x] 1.1.15 Verify `getEffectiveConfig` utilizes the internal cache (`loadedPluginConfigsCache`) to return previously resolved configurations for the same plugin specification and overrides.
  - **test_id:** 1.1.15
  - **status:** CLOSED
  - **test_target:** ConfigResolver
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getEffectiveConfig` utilizes the internal cache (`loadedPluginConfigsCache`) to return previously resolved configurations for the same plugin specification and overrides.
* [x] 1.2.1 Verify the constructor correctly initializes `projectRoot`, `xdgBaseDir`, `projectManifestConfigPath`, and related path properties, handling `XDG_CONFIG_HOME` environment variable.
  - **test_id:** 1.2.1
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the constructor correctly initializes `projectRoot`, `xdgBaseDir`, `projectManifestConfigPath`, and related path properties, handling `XDG_CONFIG_HOME` environment variable.
* [x] 1.2.2 Test the constructor throws an error if `projectRoot` is not provided or is invalid.
  - **test_id:** 1.2.2
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test the constructor throws an error if `projectRoot` is not provided or is invalid.
* [x] 1.2.3 Verify the constructor correctly determines `cmCollRoot` based on `XDG_DATA_HOME` or OS-specific default paths.
  - **test_id:** 1.2.3
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the constructor correctly determines `cmCollRoot` based on `XDG_DATA_HOME` or OS-specific default paths.
* [ ] 1.2.4 Test `_resolveAlias` resolves a tilde-prefixed alias value to an absolute path in the user's home directory.
  - **test_id:** 1.2.4
  - **status:** OPEN
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_resolveAlias` resolves a tilde-prefixed alias value to an absolute path in the user's home directory.
* [x] 1.2.5 Verify `_resolveAlias` resolves a relative alias value correctly against the provided `basePathDefiningAlias`.
  - **test_id:** 1.2.5
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_resolveAlias` resolves a relative alias value correctly against the provided `basePathDefiningAlias`.
* [x] 1.2.6 Test `_resolveAlias` returns `null` for invalid or empty `aliasValue` or if `basePathDefiningAlias` is missing for a relative path.
  - **test_id:** 1.2.6
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_resolveAlias` returns `null` for invalid or empty `aliasValue` or if `basePathDefiningAlias` is missing for a relative path.
* [x] 1.2.7 Verify `_resolvePluginConfigPath` correctly resolves an alias-prefixed raw path (e.g., `myAlias:path/to/plugin`) using provided `currentAliases`.
  - **test_id:** 1.2.7
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_resolvePluginConfigPath` correctly resolves an alias-prefixed raw path (e.g., `myAlias:path/to/plugin`) using provided `currentAliases`.
* [ ] 1.2.8 Test `_resolvePluginConfigPath` resolves a tilde-prefixed raw path to an absolute path in the user's home directory.
  - **test_id:** 1.2.8
  - **status:** OPEN
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_resolvePluginConfigPath` resolves a tilde-prefixed raw path to an absolute path in the user's home directory.
* [x] 1.2.9 Verify `_resolvePluginConfigPath` resolves a relative raw path correctly against `basePathForMainConfig`.
  - **test_id:** 1.2.9
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_resolvePluginConfigPath` resolves a relative raw path correctly against `basePathForMainConfig`.
* [x] 1.2.10 Test `_resolvePluginConfigPath` correctly identifies the conventional config file (`dirname.config.yaml`) when a directory path is provided.
  - **test_id:** 1.2.10
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_resolvePluginConfigPath` correctly identifies the conventional config file (`dirname.config.yaml`) when a directory path is provided.
* [x] 1.2.11 Verify `_resolvePluginConfigPath` finds an alternative `*.config.yaml` file in a directory if the conventional name is not present.
  - **test_id:** 1.2.11
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_resolvePluginConfigPath` finds an alternative `*.config.yaml` file in a directory if the conventional name is not present.
* [x] 1.2.12 Test `_resolvePluginConfigPath` returns `null` if the resolved path (file or directory) does not exist.
  - **test_id:** 1.2.12
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_resolvePluginConfigPath` returns `null` if the resolved path (file or directory) does not exist.
* [x] 1.2.13 Verify `_resolvePluginConfigPath` returns `null` and logs a warning if a directory is provided but no `*.config.yaml` file is found within it.
  - **test_id:** 1.2.13
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_resolvePluginConfigPath` returns `null` and logs a warning if a directory is provided but no `*.config.yaml` file is found within it.
* [x] 1.2.14 Test `_getPluginRegistrationsFromFile` successfully loads aliases and plugin registrations from a valid YAML config file.
  - **test_id:** 1.2.14
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_getPluginRegistrationsFromFile` successfully loads aliases and plugin registrations from a valid YAML config file.
* [x] 1.2.15 Verify `_getPluginRegistrationsFromFile` returns an empty object if the specified config file does not exist or is empty.
  - **test_id:** 1.2.15
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_getPluginRegistrationsFromFile` returns an empty object if the specified config file does not exist or is empty.
* [x] 1.2.16 Test `_getPluginRegistrationsFromFile` handles invalid YAML format gracefully and returns an empty object.
  - **test_id:** 1.2.16
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_getPluginRegistrationsFromFile` handles invalid YAML format gracefully and returns an empty object.
* [x] 1.2.17 Verify aliases defined within the config file are correctly resolved and used when resolving plugin paths.
  - **test_id:** 1.2.17
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify aliases defined within the config file are correctly resolved and used when resolving plugin paths.
* [x] 1.2.18 Test `_getPluginRegistrationsFromCmManifest` correctly loads enabled plugins from a valid `enabled.yaml` manifest, enriching their details.
  - **test_id:** 1.2.18
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_getPluginRegistrationsFromCmManifest` correctly loads enabled plugins from a valid `enabled.yaml` manifest, enriching their details.
* [x] 1.2.19 Verify `_getPluginRegistrationsFromCmManifest` returns an empty object if the CM manifest file does not exist.
  - **test_id:** 1.2.19
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_getPluginRegistrationsFromCmManifest` returns an empty object if the CM manifest file does not exist.
* [x] 1.2.20 Test `_getPluginRegistrationsFromCmManifest` handles invalid entries in the CM manifest (e.g., missing `invoke_name` or `config_path`) by skipping them and logging a warning.
  - **test_id:** 1.2.20
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_getPluginRegistrationsFromCmManifest` handles invalid entries in the CM manifest (e.g., missing `invoke_name` or `config_path`) by skipping them and logging a warning.
* [x] 1.2.21 Verify `_getPluginRegistrationsFromCmManifest` skips CM-enabled plugins whose `config_path` does not exist on the file system.
  - **test_id:** 1.2.21
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_getPluginRegistrationsFromCmManifest` skips CM-enabled plugins whose `config_path` does not exist on the file system.
* [x] 1.2.22 Test `buildRegistry` correctly merges plugin registrations from Factory Defaults (or Bundled Definitions) when `useFactoryDefaultsOnly` is true.
  - **test_id:** 1.2.22
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `buildRegistry` correctly merges plugin registrations from Factory Defaults (or Bundled Definitions) when `useFactoryDefaultsOnly` is true.
* [x] 1.2.23 Verify `buildRegistry` correctly merges registrations from Bundled Definitions, then XDG Global, then Project Manifest when `useFactoryDefaultsOnly` is false.
  - **test_id:** 1.2.23
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `buildRegistry` correctly merges registrations from Bundled Definitions, then XDG Global, then Project Manifest when `useFactoryDefaultsOnly` is false.
* [ ] 1.2.24 Test `buildRegistry`'s caching mechanism, ensuring it returns a cached registry if relevant build parameters haven't changed.
  - **test_id:** 1.2.24
  - **status:** OPEN
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `buildRegistry`'s caching mechanism, ensuring it returns a cached registry if relevant build parameters haven't changed.
* [x] 1.2.25 Verify `buildRegistry` includes CM-enabled plugins from `enabled.yaml` when `collectionsManager` is *not* provided to the constructor.
  - **test_id:** 1.2.25
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `buildRegistry` includes CM-enabled plugins from `enabled.yaml` when `collectionsManager` is *not* provided to the constructor.
* [x] 1.2.26 Test `buildRegistry` handles missing `factoryDefaultMainConfigPath` or `bundledMainConfigPath` gracefully without crashing.
  - **test_id:** 1.2.26
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `buildRegistry` handles missing `factoryDefaultMainConfigPath` or `bundledMainConfigPath` gracefully without crashing.
* [x] 1.2.27 Verify `getAllPluginDetails` correctly combines plugins from traditional config files and CM-enabled plugins (when `collectionsManager` is provided), providing comprehensive details.
  - **test_id:** 1.2.27
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getAllPluginDetails` correctly combines plugins from traditional config files and CM-enabled plugins (when `collectionsManager` is provided), providing comprehensive details.
* [x] 1.2.28 Test `getAllPluginDetails` correctly retrieves and includes the `description` from each plugin's config file.
  - **test_id:** 1.2.28
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getAllPluginDetails` correctly retrieves and includes the `description` from each plugin's config file.
* [x] 1.2.29 Verify `getAllPluginDetails` correctly sets `status` and `registrationSourceDisplay` for plugins registered via traditional configs.
  - **test_id:** 1.2.29
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getAllPluginDetails` correctly sets `status` and `registrationSourceDisplay` for plugins registered via traditional configs.
* [x] 1.2.30 Test `getAllPluginDetails` correctly distinguishes between 'Enabled (CM)' and 'Available (CM)' plugins when `collectionsManager` is provided.
  - **test_id:** 1.2.30
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getAllPluginDetails` correctly distinguishes between 'Enabled (CM)' and 'Available (CM)' plugins when `collectionsManager` is provided.
* [x] 1.2.31 Verify `getAllPluginDetails` handles multiple enabled instances of the same CM plugin (via different invoke names) and lists them separately.
  - **test_id:** 1.2.31
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getAllPluginDetails` handles multiple enabled instances of the same CM plugin (via different invoke names) and lists them separately.
* [x] 1.2.32 Test that `getAllPluginDetails` returns the list of plugins sorted alphabetically by their `name` property.
  - **test_id:** 1.2.32
  - **status:** CLOSED
  - **test_target:** PluginRegistryBuilder
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test that `getAllPluginDetails` returns the list of plugins sorted alphabetically by their `name` property.
* [x] 1.3.1 Verify `determinePluginToUse` correctly prioritizes a plugin specified via the CLI argument (`args.plugin`) over all other sources.
  - **test_id:** 1.3.1
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `determinePluginToUse` correctly prioritizes a plugin specified via the CLI argument (`args.plugin`) over all other sources.
* [ ] 1.3.2 Test `determinePluginToUse` correctly prioritizes a plugin specified in the Markdown file's front matter (`frontMatter.md_to_pdf_plugin`) when no CLI argument is present.
  - **test_id:** 1.3.2
  - **status:** OPEN
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `determinePluginToUse` correctly prioritizes a plugin specified in the Markdown file's front matter (`frontMatter.md_to_pdf_plugin`) when no CLI argument is present.
* [x] 1.3.3 Verify `determinePluginToUse` correctly prioritizes a plugin specified in the local `.config.yaml` file (next to the Markdown file) when neither CLI nor front matter specify a plugin.
  - **test_id:** 1.3.3
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `determinePluginToUse` correctly prioritizes a plugin specified in the local `.config.yaml` file (next to the Markdown file) when neither CLI nor front matter specify a plugin.
* [x] 1.3.4 Test `determinePluginToUse` returns the `defaultPluginName` when no plugin is specified via CLI, front matter, or local config.
  - **test_id:** 1.3.4
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `determinePluginToUse` returns the `defaultPluginName` when no plugin is specified via CLI, front matter, or local config.
* [x] 1.3.5 Verify `determinePluginToUse` correctly extracts and returns `localConfigOverrides` from the local `.config.yaml` file, excluding the `plugin` field.
  - **test_id:** 1.3.5
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `determinePluginToUse` correctly extracts and returns `localConfigOverrides` from the local `.config.yaml` file, excluding the `plugin` field.
* [x] 1.3.6 Test `determinePluginToUse` handles a non-existent `args.markdownFile` by not attempting to read front matter or local config and defaulting appropriately.
  - **test_id:** 1.3.6
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `determinePluginToUse` handles a non-existent `args.markdownFile` by not attempting to read front matter or local config and defaulting appropriately.
* [x] 1.3.7 Verify `determinePluginToUse` gracefully handles errors (e.g., malformed YAML) when reading front matter from the Markdown file.
  - **test_id:** 1.3.7
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `determinePluginToUse` gracefully handles errors (e.g., malformed YAML) when reading front matter from the Markdown file.
* [x] 1.3.8 Test `determinePluginToUse` gracefully handles errors (e.g., malformed YAML) when reading the local `.config.yaml` file.
  - **test_id:** 1.3.8
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `determinePluginToUse` gracefully handles errors (e.g., malformed YAML) when reading the local `.config.yaml` file.
* [x] 1.3.9 Verify "self-activation" logic: a plugin specified by name (from FM or local config) is resolved to a path within a subdirectory of the markdown file (e.g., `markdownDir/pluginName/pluginName.config.yaml`).
  - **test_id:** 1.3.9
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify "self-activation" logic: a plugin specified by name (from FM or local config) is resolved to a path within a subdirectory of the markdown file (e.g., `markdownDir/pluginName/pluginName.config.yaml`).
* [x] 1.3.10 Test "self-activation" logic: if no subdirectory, a plugin specified by name is resolved to a path directly in the markdown file's directory (e.g., `markdownDir/pluginName.config.yaml`).
  - **test_id:** 1.3.10
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test "self-activation" logic: if no subdirectory, a plugin specified by name is resolved to a path directly in the markdown file's directory (e.g., `markdownDir/pluginName.config.yaml`).
* [x] 1.3.11 Verify that if a plugin specified by name (from FM or local config) cannot be self-activated, its original name (not a path) is retained for resolution by `ConfigResolver`.
  - **test_id:** 1.3.11
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify that if a plugin specified by name (from FM or local config) cannot be self-activated, its original name (not a path) is retained for resolution by `ConfigResolver`.
* [x] 1.3.12 Test `determinePluginToUse` correctly resolves a relative `pluginSpec` (e.g., `./plugin-path`) against the `markdownFilePathAbsolute` when present.
  - **test_id:** 1.3.12
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `determinePluginToUse` correctly resolves a relative `pluginSpec` (e.g., `./plugin-path`) against the `markdownFilePathAbsolute` when present.
* [x] 1.3.13 Verify `determinePluginToUse` correctly resolves a relative `pluginSpec` against the current working directory (`process.cwd()`) if `markdownFilePathAbsolute` is not available.
  - **test_id:** 1.3.13
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `determinePluginToUse` correctly resolves a relative `pluginSpec` against the current working directory (`process.cwd()`) if `markdownFilePathAbsolute` is not available.
* [x] 1.3.14 Test the logging mechanism correctly reports the determination source and avoids redundant log messages when an override occurs.
  - **test_id:** 1.3.14
  - **status:** CLOSED
  - **test_target:** plugin_determiner
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test the logging mechanism correctly reports the determination source and avoids redundant log messages when an override occurs.
* [x] 1.4.1 Verify the constructor correctly initializes `projectRoot`, `defaultMainConfigPath`, and `factoryDefaultMainConfigPath` based on the provided `projectRoot`.
  - **test_id:** 1.4.1
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the constructor correctly initializes `projectRoot`, `defaultMainConfigPath`, and `factoryDefaultMainConfigPath` based on the provided `projectRoot`.
* [x] 1.4.2 Test the constructor correctly determines `xdgBaseDir` and `xdgGlobalConfigPath` using `XDG_CONFIG_HOME` environment variable if `xdgBaseDir` parameter is null.
  - **test_id:** 1.4.2
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test the constructor correctly determines `xdgBaseDir` and `xdgGlobalConfigPath` using `XDG_CONFIG_HOME` environment variable if `xdgBaseDir` parameter is null.
* [x] 1.4.3 Verify the constructor correctly uses the provided `xdgBaseDir` parameter when it's not null.
  - **test_id:** 1.4.3
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the constructor correctly uses the provided `xdgBaseDir` parameter when it's not null.
* [x] 1.4.4 Test the constructor correctly sets `projectManifestConfigPath` and `useFactoryDefaultsOnly` from constructor arguments.
  - **test_id:** 1.4.4
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test the constructor correctly sets `projectManifestConfigPath` and `useFactoryDefaultsOnly` from constructor arguments.
* [x] 1.4.5 Verify `_initialize` correctly selects `factoryDefaultMainConfigPath` as primary when `useFactoryDefaultsOnly` is true.
  - **test_id:** 1.4.5
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` correctly selects `factoryDefaultMainConfigPath` as primary when `useFactoryDefaultsOnly` is true.
* [x] 1.4.6 Test `_initialize` correctly prioritizes `projectManifestConfigPath` (from CLI) if it exists and `useFactoryDefaultsOnly` is false.
  - **test_id:** 1.4.6
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` correctly prioritizes `projectManifestConfigPath` (from CLI) if it exists and `useFactoryDefaultsOnly` is false.
* [x] 1.4.7 Verify `_initialize` correctly prioritizes `xdgGlobalConfigPath` if it exists and neither CLI config nor `useFactoryDefaultsOnly` applies.
  - **test_id:** 1.4.7
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` correctly prioritizes `xdgGlobalConfigPath` if it exists and neither CLI config nor `useFactoryDefaultsOnly` applies.
* [x] 1.4.8 Test `_initialize` correctly prioritizes `defaultMainConfigPath` (bundled) if it exists and no higher-priority config is found.
  - **test_id:** 1.4.8
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` correctly prioritizes `defaultMainConfigPath` (bundled) if it exists and no higher-priority config is found.
* [x] 1.4.9 Verify `_initialize` falls back to `factoryDefaultMainConfigPath` if no other primary main configuration file is found.
  - **test_id:** 1.4.9
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` falls back to `factoryDefaultMainConfigPath` if no other primary main configuration file is found.
* [x] 1.4.10 Test `_initialize` loads the selected primary config file correctly and sets `primaryConfig`, `primaryConfigPath`, and `primaryConfigLoadReason`.
  - **test_id:** 1.4.10
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` loads the selected primary config file correctly and sets `primaryConfig`, `primaryConfigPath`, and `primaryConfigLoadReason`.
* [x] 1.4.11 Verify `_initialize` sets `primaryConfig` to an empty object if the determined `configPathToLoad` does not exist or fails to load.
  - **test_id:** 1.4.11
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` sets `primaryConfig` to an empty object if the determined `configPathToLoad` does not exist or fails to load.
* [x] 1.4.12 Test `_initialize` loads `xdgConfigContents` from `xdgGlobalConfigPath` if it exists and is not the primary config.
  - **test_id:** 1.4.12
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` loads `xdgConfigContents` from `xdgGlobalConfigPath` if it exists and is not the primary config.
* [x] 1.4.13 Verify `_initialize` sets `xdgConfigContents` to an empty object if `xdgGlobalConfigPath` does not exist or loading fails.
  - **test_id:** 1.4.13
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` sets `xdgConfigContents` to an empty object if `xdgGlobalConfigPath` does not exist or loading fails.
* [ ] 1.4.14 Test `_initialize` loads `projectConfigContents` from `projectManifestConfigPath` if it exists and is not the primary config.
  - **test_id:** 1.4.14
  - **status:** OPEN
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` loads `projectConfigContents` from `projectManifestConfigPath` if it exists and is not the primary config.
* [ ] 1.4.15 Verify `_initialize` sets `projectConfigContents` to an empty object if `projectManifestConfigPath` does not exist or loading fails.
  - **test_id:** 1.4.15
  - **status:** OPEN
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_initialize` sets `projectConfigContents` to an empty object if `projectManifestConfigPath` does not exist or loading fails.
* [x] 1.4.16 Test `_initialize` correctly sets `_initialized` to true after completion.
  - **test_id:** 1.4.16
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_initialize` correctly sets `_initialized` to true after completion.
* [x] 1.4.17 Verify `getPrimaryMainConfig` returns the primary configuration object, including the added `projectRoot` property, along with its path, base directory, and load reason.
  - **test_id:** 1.4.17
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getPrimaryMainConfig` returns the primary configuration object, including the added `projectRoot` property, along with its path, base directory, and load reason.
* [x] 1.4.18 Test `getXdgMainConfig` returns the XDG global configuration object, including the added `projectRoot` property, along with its path and base directory.
  - **test_id:** 1.4.18
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getXdgMainConfig` returns the XDG global configuration object, including the added `projectRoot` property, along with its path and base directory.
* [x] 1.4.19 Verify `getProjectManifestConfig` returns the project manifest configuration object, including the added `projectRoot` property, along with its path and base directory.
  - **test_id:** 1.4.19
  - **status:** CLOSED
  - **test_target:** main_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getProjectManifestConfig` returns the project manifest configuration object, including the added `projectRoot` property, along with its path and base directory.
* [x] 1.5.1 Verify that the `PluginManager` constructor initializes without throwing errors and sets no significant internal state, reflecting its simple design.
  - **test_id:** 1.5.1
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify that the `PluginManager` constructor initializes without throwing errors and sets no significant internal state, reflecting its simple design.
* [x] 1.5.2 Test `invokeHandler` successfully loads and invokes a class-based plugin handler, ensuring `coreUtils` are correctly passed to its constructor.
  - **test_id:** 1.5.2
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `invokeHandler` successfully loads and invokes a class-based plugin handler, ensuring `coreUtils` are correctly passed to its constructor.
* [x] 1.5.3 Verify `invokeHandler` correctly passes `data`, `pluginSpecificConfig`, `mainConfig`, `outputDir`, `outputFilenameOpt`, and `pluginBasePath` to the plugin's `generate` method.
  - **test_id:** 1.5.3
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `invokeHandler` correctly passes `data`, `pluginSpecificConfig`, `mainConfig`, `outputDir`, `outputFilenameOpt`, and `pluginBasePath` to the plugin's `generate` method.
* [x] 1.5.4 Test `invokeHandler` successfully loads and invokes an object-based plugin handler that exports a `generate` function directly, logging a warning about constructor injection.
  - **test_id:** 1.5.4
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `invokeHandler` successfully loads and invokes an object-based plugin handler that exports a `generate` function directly, logging a warning about constructor injection.
* [x] 1.5.5 Verify `invokeHandler` throws an error if `effectiveConfig.handlerScriptPath` is missing or undefined.
  - **test_id:** 1.5.5
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `invokeHandler` throws an error if `effectiveConfig.handlerScriptPath` is missing or undefined.
* [x] 1.5.6 Test `invokeHandler` throws an error if the loaded handler module does not export a class or a `generate` function.
  - **test_id:** 1.5.6
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `invokeHandler` throws an error if the loaded handler module does not export a class or a `generate` function.
* [x] 1.5.7 Verify `invokeHandler` throws an error if the handler instance (either class or object) does not have a `generate` method.
  - **test_id:** 1.5.7
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `invokeHandler` throws an error if the handler instance (either class or object) does not have a `generate` method.
* [x] 1.5.8 Test `invokeHandler` catches and logs errors thrown by the plugin's `generate` method and returns `null`.
  - **test_id:** 1.5.8
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `invokeHandler` catches and logs errors thrown by the plugin's `generate` method and returns `null`.
* [x] 1.5.9 Verify `invokeHandler` returns the promise resolution (e.g., path to PDF) from the successfully invoked plugin's `generate` method.
  - **test_id:** 1.5.9
  - **status:** CLOSED
  - **test_target:** PluginManager
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `invokeHandler` returns the promise resolution (e.g., path to PDF) from the successfully invoked plugin's `generate` method.
* [x] 1.6.1 Verify the constructor correctly initializes `xdgBaseDir`, `xdgMainConfig`, `projectBaseDir`, `projectMainConfig`, and `useFactoryDefaultsOnly` from arguments, setting defaults for configs if null.
  - **test_id:** 1.6.1
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the constructor correctly initializes `xdgBaseDir`, `xdgMainConfig`, `projectBaseDir`, `projectMainConfig`, and `useFactoryDefaultsOnly` from arguments, setting defaults for configs if null.
* [x] 1.6.2 Test `_loadSingleConfigLayer` successfully loads a valid YAML config file and resolves initial CSS paths using `AssetResolver.resolveAndMergeCss`.
  - **test_id:** 1.6.2
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_loadSingleConfigLayer` successfully loads a valid YAML config file and resolves initial CSS paths using `AssetResolver.resolveAndMergeCss`.
* [x] 1.6.3 Verify `_loadSingleConfigLayer` caches loaded config data and returns the cached result on subsequent calls with the same parameters.
  - **test_id:** 1.6.3
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_loadSingleConfigLayer` caches loaded config data and returns the cached result on subsequent calls with the same parameters.
* [x] 1.6.4 Test `_loadSingleConfigLayer` returns `null` if the `configFilePath` is not provided or the file does not exist.
  - **test_id:** 1.6.4
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `_loadSingleConfigLayer` returns `null` if the `configFilePath` is not provided or the file does not exist.
* [x] 1.6.5 Verify `_loadSingleConfigLayer` handles errors during YAML parsing or file reading gracefully, returning an empty config object.
  - **test_id:** 1.6.5
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `_loadSingleConfigLayer` handles errors during YAML parsing or file reading gracefully, returning an empty config object.
* [x] 1.6.6 Test `applyOverrideLayers` returns the original `layer0ConfigData` unchanged when `useFactoryDefaultsOnly` is true.
  - **test_id:** 1.6.6
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `applyOverrideLayers` returns the original `layer0ConfigData` unchanged when `useFactoryDefaultsOnly` is true.
* [x] 1.6.7 Verify `applyOverrideLayers` correctly applies overrides from an XDG-specific plugin config file (`~/.config/md-to-pdf/pluginName/pluginName.config.yaml`) if it exists.
  - **test_id:** 1.6.7
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `applyOverrideLayers` correctly applies overrides from an XDG-specific plugin config file (`~/.config/md-to-pdf/pluginName/pluginName.config.yaml`) if it exists.
* [x] 1.6.8 Test `applyOverrideLayers` correctly applies inline overrides from the `xdgMainConfig` (e.g., `xdgMainConfig.pluginName: { ... }`).
  - **test_id:** 1.6.8
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `applyOverrideLayers` correctly applies inline overrides from the `xdgMainConfig` (e.g., `xdgMainConfig.pluginName: { ... }`).
* [x] 1.6.9 Verify `applyOverrideLayers` correctly applies overrides from a project-specific plugin config file referenced in `projectMainConfig.plugins[pluginName]`.
  - **test_id:** 1.6.9
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `applyOverrideLayers` correctly applies overrides from a project-specific plugin config file referenced in `projectMainConfig.plugins[pluginName]`.
* [x] 1.6.10 Test `applyOverrideLayers` correctly applies inline overrides from the `projectMainConfig` (e.g., `projectMainConfig.pluginName: { ... }`).
  - **test_id:** 1.6.10
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `applyOverrideLayers` correctly applies inline overrides from the `projectMainConfig` (e.g., `projectMainConfig.pluginName: { ... }`).
* [x] 1.6.11 Verify `applyOverrideLayers` correctly merges CSS files and respects `inherit_css` across all override layers, using `AssetResolver.resolveAndMergeCss`.
  - **test_id:** 1.6.11
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `applyOverrideLayers` correctly merges CSS files and respects `inherit_css` across all override layers, using `AssetResolver.resolveAndMergeCss`.
* [x] 1.6.12 Test `applyOverrideLayers` correctly resolves relative and tilde-prefixed paths within XDG and Project file-based overrides.
  - **test_id:** 1.6.12
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `applyOverrideLayers` correctly resolves relative and tilde-prefixed paths within XDG and Project file-based overrides.
* [x] 1.6.13 Verify `applyOverrideLayers` accurately updates `contributingPaths` with the paths of all applied override layers.
  - **test_id:** 1.6.13
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `applyOverrideLayers` accurately updates `contributingPaths` with the paths of all applied override layers.
* [x] 1.6.14 Test `applyOverrideLayers` gracefully handles non-existent XDG or Project override files/paths by skipping them and logging warnings.
  - **test_id:** 1.6.14
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `applyOverrideLayers` gracefully handles non-existent XDG or Project override files/paths by skipping them and logging warnings.
* [x] 1.6.15 Verify the precedence of overrides: project overrides (file then inline) take precedence over XDG overrides (file then inline), which take precedence over the base plugin config (Layer 0).
  - **test_id:** 1.6.15
  - **status:** CLOSED
  - **test_target:** plugin_config_loader
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify the precedence of overrides: project overrides (file then inline) take precedence over XDG overrides (file then inline), which take precedence over the base plugin config (Layer 0).
* [ ] 1.7.1 Verify `configureMarkdownItForMath` successfully applies the `@vscode/markdown-it-katex` plugin to the `MarkdownIt` instance when math is enabled and engine is 'katex'.
  - **test_id:** 1.7.1
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `configureMarkdownItForMath` successfully applies the `@vscode/markdown-it-katex` plugin to the `MarkdownIt` instance when math is enabled and engine is 'katex'.
* [ ] 1.7.2 Test `configureMarkdownItForMath` passes `mathConfig.katex_options` correctly to the KaTeX plugin.
  - **test_id:** 1.7.2
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `configureMarkdownItForMath` passes `mathConfig.katex_options` correctly to the KaTeX plugin.
* [ ] 1.7.3 Verify `configureMarkdownItForMath` does nothing if math is not enabled or the engine is not 'katex'.
  - **test_id:** 1.7.3
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `configureMarkdownItForMath` does nothing if math is not enabled or the engine is not 'katex'.
* [ ] 1.7.4 Test `configureMarkdownItForMath` logs an error and returns if `@vscode/markdown-it-katex` cannot be `require`d or is not a valid plugin function.
  - **test_id:** 1.7.4
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `configureMarkdownItForMath` logs an error and returns if `@vscode/markdown-it-katex` cannot be `require`d or is not a valid plugin function.
* [ ] 1.7.5 Verify `getMathCssContent` returns the content of `katex.min.css` as a string within an array when math is enabled and the file exists.
  - **test_id:** 1.7.5
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getMathCssContent` returns the content of `katex.min.css` as a string within an array when math is enabled and the file exists.
* [ ] 1.7.6 Test `getMathCssContent` returns an empty array if math is not enabled or the engine is not 'katex'.
  - **test_id:** 1.7.6
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getMathCssContent` returns an empty array if math is not enabled or the engine is not 'katex'.
* [ ] 1.7.7 Verify `getMathCssContent` returns an empty array and logs a warning if `katex.min.css` file does not exist at the expected path.
  - **test_id:** 1.7.7
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `getMathCssContent` returns an empty array and logs a warning if `katex.min.css` file does not exist at the expected path.
* [ ] 1.7.8 Test `getMathCssContent` returns an empty array and logs a warning if there's an error reading `katex.min.css` file.
  - **test_id:** 1.7.8
  - **status:** OPEN
  - **test_target:** math_integration
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `getMathCssContent` returns an empty array and logs a warning if there's an error reading `katex.min.css` file.
* [x] 1.8.1 Verify `deriveCollectionName` correctly sanitizes a URL or path.
  - **test_id:** 1.8.1
  - **status:** CLOSED
  - **test_target:** cm-utils
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `deriveCollectionName` correctly sanitizes a URL or path.
* [x] 1.8.2 Test `toPascalCase` correctly converts various hyphenated strings to PascalCase.
  - **test_id:** 1.8.2
  - **status:** CLOSED
  - **test_target:** cm-utils
  - **test_type:** MODULE_INTEGRATION
  - **description:** Test `toPascalCase` correctly converts various hyphenated strings to PascalCase.
* [x] 1.8.3 Verify `isValidPluginName` correctly validates plugin names.
  - **test_id:** 1.8.3
  - **status:** CLOSED
  - **test_target:** cm-utils
  - **test_type:** MODULE_INTEGRATION
  - **description:** Verify `isValidPluginName` correctly validates plugin names.
