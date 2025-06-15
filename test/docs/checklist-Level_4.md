* [ ] 4.1.1 A user can successfully perform the entire lifecycle of adding a plugin collection, enabling a plugin from it, using that plugin to convert a document, disabling the plugin, and finally removing the collection. This verifies the integrity of the collections manager state across multiple commands.
  - **test_id:** 4.1.1
  - **status:** OPEN
  - **test_target:** CLI Commands Interaction
  - **test_type:** E2E_WORKFLOW
  - **description:** A user can successfully perform the entire lifecycle of adding a plugin collection, enabling a plugin from it, using that plugin to convert a document, disabling the plugin, and finally removing the collection. This verifies the integrity of the collections manager state across multiple commands.
* [ ] 4.2.1 (Happy Path) The `--watch` flag successfully triggers an initial conversion, and upon modification of the source Markdown file, automatically triggers a re-conversion.
  - **test_id:** 4.2.1
  - **status:** OPEN
  - **test_target:** convert --watch
  - **test_type:** E2E_ASYNC
  - **description:** (Happy Path) The `--watch` flag successfully triggers an initial conversion, and upon modification of the source Markdown file, automatically triggers a re-conversion.
* [ ] 4.17.2 (Dependency Change) When a file that a plugin depends on (e.g., a CSS file or a data source listed in `watch_sources`) is modified, the `--watch` mode successfully triggers a re-conversion.
  - **test_id:** 4.17.2
  - **status:** OPEN
  - **test_target:** convert --watch
  - **test_type:** E2E_ASYNC
  - **description:** (Dependency Change) When a file that a plugin depends on (e.g., a CSS file or a data source listed in `watch_sources`) is modified, the `--watch` mode successfully triggers a re-conversion.
* [ ] 4.3.1 The `collection update` command correctly fails with a non-zero exit code and an informative error message when attempting to update a Git-based collection that has local, uncommitted changes.
  - **test_id:** 4.3.1
  - **status:** OPEN
  - **test_target:** collection update
  - **test_type:** E2E_SAD_PATH
  - **description:** The `collection update` command correctly fails with a non-zero exit code and an informative error message when attempting to update a Git-based collection that has local, uncommitted changes.
* [ ] 4.3.2 The `plugin create --from <source>` command fails gracefully with a non-zero exit code when the `<source>` path points to a directory that is not a valid plugin (e.g., is missing a `*.config.yaml` or `index.js`).
  - **test_id:** 4.3.2
  - **status:** OPEN
  - **test_target:** plugin create --from
  - **test_type:** E2E_SAD_PATH
  - **description:** The `plugin create --from <source>` command fails gracefully with a non-zero exit code when the `<source>` path points to a directory that is not a valid plugin (e.g., is missing a `*.config.yaml` or `index.js`).
