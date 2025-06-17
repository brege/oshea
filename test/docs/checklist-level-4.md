# Level 4 - Test Scenario Checklist (Advanced E2E)

This checklist outlines advanced End-to-End (E2E) scenarios. These tests verify complex user workflows, interaction between commands, and stateful application features.

Status Legend:
[ ] Proposed,
[x] Completed (test implemented & passing),
[S] Skipped by User,
[?] Pending (see audit log for details).

## Test Target ID Mapping for Level 4

* **Y.1:** Full User Workflow (Lifecycle)
* **Y.2:** Watch Mode (`--watch`)
* **Y.3:** Advanced Sad Paths & Edge Cases

---

## Y.1 Full User Workflow (Lifecycle)

* [ ] 4.1.1 A user can successfully perform the entire lifecycle of adding a plugin collection, enabling a plugin from it, using that plugin to convert a document, disabling the plugin, and finally removing the collection. This verifies the integrity of the collections manager state across multiple commands.
  - **test_id:** 4.1.1
  - **status:** OPEN
  - **test_target:** CLI Commands Interaction
  - **test_type:** E2E_WORKFLOW
  - **description:** A user can successfully perform the entire lifecycle of adding a plugin collection, enabling a plugin from it, using that plugin to convert a document, disabling the plugin, and finally removing the collection. This verifies the integrity of the collections manager state across multiple commands.

* [ ] 4.1.2 A user can successfully archetype a plugin from a managed collection, add it back as a new managed plugin, and use it for a conversion.
  - **test_id:** 4.1.2
  - **status:** OPEN
  - **test_target:** CLI Commands Interaction
  - **test_type:** E2E_WORKFLOW
  - **description:** A user can successfully add a collection, create a new plugin by archetyping from it, add that new local plugin to be managed by the system, use it to convert a document, and then disable/remove it, verifying a complete user workflow.

## Y.2 Watch Mode

* [ ] 4.2.1 (Happy Path) The `--watch` flag successfully triggers an initial conversion, and upon modification of the source Markdown file, automatically triggers a re-conversion.
  - **test_id:** 4.2.1
  - **status:** OPEN
  - **test_target:** convert --watch
  - **test_type:** E2E_ASYNC
  - **description:** (Happy Path) The `--watch` flag successfully triggers an initial conversion, and upon modification of the source Markdown file, automatically triggers a re-conversion.

* [ ] 4.2.2 (Dependency Change) When a file that a plugin depends on (e.g., a CSS file or a data source listed in `watch_sources`) is modified, the `--watch` mode successfully triggers a re-conversion.
  - **test_id:** 4.17.2
  - **status:** OPEN
  - **test_target:** convert --watch
  - **test_type:** E2E_ASYNC
  - **description:** (Dependency Change) When a file that a plugin depends on (e.g., a CSS file or a data source listed in `watch_sources`) is modified, the `--watch` mode successfully triggers a re-conversion.

## Y.3 Advanced Sad Paths & Edge Cases

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
