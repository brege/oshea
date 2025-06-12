# Level 4 - Test Scenario Checklist (Advanced E2E)

This checklist outlines advanced End-to-End (E2E) scenarios. These tests verify complex user workflows, interaction between commands, and stateful application features.

Status Legend: [ ] Proposed, [x] Completed, [S] Skipped, [?] Pending

## Test Target ID Mapping for Level 4

* **Y.1:** Full User Workflow (Lifecycle)
* **Y.2:** Watch Mode (`--watch`)
* **Y.3:** Advanced Sad Paths & Edge Cases

---

## Y.1. Full Lifecycle Scenario

* [ ] **4.1.1 TEST_TARGET**: `CLI Commands Interaction`
    **TEST_TYPE**: `E2E_WORKFLOW`
    **SCENARIO_DESCRIPTION**: A user can successfully perform the entire lifecycle of adding a plugin collection, enabling a plugin from it, using that plugin to convert a document, disabling the plugin, and finally removing the collection. This verifies the integrity of the collections manager state across multiple commands.

## Y.1. Watch Mode (`--watch`)

* [ ] **4.2.1 TEST_TARGET**: `convert --watch`
    **TEST_TYPE**: `E2E_ASYNC`
    **SCENARIO_DESCRIPTION**: (Happy Path) The `--watch` flag successfully triggers an initial conversion, and upon modification of the source Markdown file, automatically triggers a re-conversion.

* [ ] **4.17.2 TEST_TARGET**: `convert --watch`
    **TEST_TYPE**: `E2E_ASYNC`
    **SCENARIO_DESCRIPTION**: (Dependency Change) When a file that a plugin depends on (e.g., a CSS file or a data source listed in `watch_sources`) is modified, the `--watch` mode successfully triggers a re-conversion.

## Y.3. Advanced Sad Paths & Edge Cases

* [ ] **4.3.1 TEST_TARGET**: `collection update`
    **TEST_TYPE**: `E2E_SAD_PATH`
    **SCENARIO_DESCRIPTION**: The `collection update` command correctly fails with a non-zero exit code and an informative error message when attempting to update a Git-based collection that has local, uncommitted changes.

* [ ] **4.3.2 TEST_TARGET**: `plugin create --from`
    **TEST_TYPE**: `E2E_SAD_PATH`
    **SCENARIO_DESCRIPTION**: The `plugin create --from <source>` command fails gracefully with a non-zero exit code when the `<source>` path points to a directory that is not a valid plugin (e.g., is missing a `*.config.yaml` or `index.js`).
