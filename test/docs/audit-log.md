# Audit Log Entries

This document summarizes key limitations and discrepancies in the `md-to-pdf` codebase identified through systematic testing and code audits. Each entry is structured for clarity and machine-readability.

---

## Entry: 1.1.2

- **test_id:** 1.1.2
- **title:** Registry Rebuild on Condition Change Not Implemented
- **component:** ConfigResolver
- **status:** SKIPPED
- **description:** `_initializeResolverIfNeeded` is non-re-entrant due to an `_initialized` flag. As a result, logic to check if `needsRegistryBuild` is true is never re-evaluated on subsequent calls.
- **impact:** In long-running processes (e.g., watch mode), configuration changes are not reflected until restart.
- **suggested_action:** Review `_initializeResolverIfNeeded`. Consider removing or relocating the `if (this._initialized) return;` check to allow dynamic registry rebuilds.

---

## Entry: L1Y1

- **test_id:** L1Y1
- **title:** Thematic Finding - Incomplete State When Stubbing Initializer Methods
- **component:** ConfigResolver
- **status:** CLOSED
- **description:** Tests that stub complex initializers often miss setting all required instance properties, causing misleading failures downstream.
- **impact:** Test failures may reflect an incomplete test setup, not a bug in the code under test.
- **suggested_action:** When stubbing initializers, manually mock and set all properties that the real initializer would have created to ensure the component is in a valid state.

---

## Entry: 1.1.11

- **test_id:** 1.1.11
- **title:** Use of External Dependency (`lodash`) for Mocking
- **component:** ConfigResolver
- **status:** CLOSED
- **description:** The test for `getEffectiveConfig` uses `lodash.merge` to provide a realistic `deepMerge` dependency.
- **impact:** This is a positive practice that keeps the test focused on verifying the `ConfigResolver`'s orchestration logic, not on re-testing a manual `deepMerge` fake.
- **suggested_action:** Continue this practice for similar scenarios.
- **notes:** `sinon.spy` is used to wrap `lodash.merge` to verify it is called correctly, which is a standard testing pattern.

---

## Entry: 1.2.4 & 1.2.8

- **test_id:** 1.2.4, 1.2.8
- **title:** Brittle Mocking for Tilde (~) Path Resolution
- **component:** PluginRegistryBuilder
- **status:** SKIPPED
- **description:** Mocking `os.homedir` with Sinon is unreliable in some test contexts, making granular tests for tilde path resolution difficult to debug.
- **impact:** These specific test scenarios are skipped.
- **suggested_action:** Cover this logic via higher-level tests or refactor the helper methods into pure functions in the future.

---

## Entry: 1.2.24

- **test_id:** 1.2.24
- **title:** Faulty Caching Logic in `buildRegistry`
- **component:** PluginRegistryBuilder
- **status:** SKIPPED
- **description:** The cache-check condition was flawed, causing expensive logic to re-run on every call instead of using the cached result.
- **impact:** Performance degradation in scenarios involving repeated registry resolutions.
- **suggested_action:** Fix the cache key logic to accurately compare all relevant properties.

---

## Entry: 1.2.27-1.2.32

- **test_id:** 1.2.27, 1.2.28, 1.2.29, 1.2.30, 1.2.31, 1.2.32
- **title:** Fragile Logic in `getAllPluginDetails`
- **component:** PluginRegistryBuilder
- **status:** OPEN
- **description:** The method incorrectly assumes available plugins are a superset of enabled plugins, which can cause enabled-only plugins to be omitted from the final list.
- **impact:** Enabled plugins may be hidden from management commands like `plugin list --all`.
- **suggested_action:** Refactor the method to process the enabled plugins list independently of the available plugins list.

---

## Entry: REFACTOR-DI

- **test_id:** REFACTOR-DI
- **title:** Refactoring of `PluginRegistryBuilder` for Testability
- **component:** PluginRegistryBuilder
- **status:** CLOSED
- **description:** Refactored the module to use a Dependency Injection (DI) pattern, making it fully testable.
- **impact:** The module's logic is now decoupled from its dependencies, enabling comprehensive testing.
- **suggested_action:** Maintain DI pattern for future extensibility.

---

## Entry: 1.3.2

- **test_id:** 1.3.2
- **title:** `determinePluginToUse` - Local Config Overrides Not Populating
- **component:** plugin_determiner
- **status:** SKIPPED
- **description:** Test fails with `AssertionError: expected null to deeply equal { anotherOverride: 'someValue' }`. `localConfigOverrides` returns `null` despite correct mocks.
- **impact:** Test cannot verify local config override logic.
- **suggested_action:** Requires interactive debugging.

---

## Entry: 1.4.14

- **test_id:** 1.4.14
- **title:** `main_config_loader` - `projectConfigContents` from `projectManifestConfigPath`
- **component:** main_config_loader
- **status:** SKIPPED
- **description:** Scenario cannot be implemented as described; `projectManifestConfigPath` is always the primary config source if present.
- **impact:** Test scenario is not valid under current implementation.
- **suggested_action:** Rephrase scenario or modify code to support secondary load if needed.

---

## Entry: 1.4.15.a

- **test_id:** 1.4.15.a
- **title:** `main_config_loader` - Inconsistent Console Warning on Missing Config
- **component:** main_config_loader
- **status:** SKIPPED
- **description:** Inconsistent and implicit `console.warn` behavior when `projectManifestConfigPath` does not exist.
- **impact:** Test cannot reliably assert warning presence or absence.
- **suggested_action:** Investigate and clarify warning logic; currently skipped.

---

## Entry: 1.6.14

- **test_id:** 1.6.14
- **title:** `plugin_config_loader` - No Warning on Missing XDG Plugin File
- **component:** plugin_config_loader
- **status:** OPEN
- **description:** No warning is logged when an XDG plugin config file is missing.
- **impact:** Users may be unaware that a configured override file was not found.
- **suggested_action:** Add a warning when XDG plugin config files are missing.

---


## Entry: L1Y7

- **test_id:** L1Y7
- **title:** Missing Test Suite for `math_integration`
- **component:** math_integration
- **status:** OPEN
- **description:** The entire Level 1 integration test suite for the `math_integration` module, covering 8 scenarios, is pending implementation.
- **impact:** There is no automated verification for KaTeX integration. This includes applying the KaTeX plugin, passing options correctly, and loading the required CSS. Regressions in math rendering features could go undetected.
- **suggested_action:** Implement the 8 pending test scenarios (1.7.1 through 1.7.8) from the `test-scenario-checklist-Level_1.md` file to validate the module's functionality.
- **notes:** This module was ranked as a lower priority during the initial test generation phase.

---

## Entry: 1.7.4

- **test_id:** 1.7.4
- **title:** Stubborn Mocking Issue in `math_integration` Test for `require` Failure
- **component:** math_integration
- **status:** SKIPPED
- **description:** The challenge lies in reliably mocking this internal `require` behavior across different test scenarios using `proxyquire`
- **impact:** The test scenario, while important for complete error handling coverage, is currently unverified by automated tests.
- **suggested_action:** Revisit this test with a deeper investigation into advanced `proxyquire` patterns for dynamic `require` mocking.

---

## Entry: L2Y1

- **test_id:** L2Y1
- **title:** Subsystem Test Completion for `collections-manager`
- **component:** collections-manager
- **status:** CLOSED
- **description:** All Level 2 tests for the module are passing after a DI refactoring effort. Discrepancies between the test plan and implementation were noted and resolved.
- **impact:** The module is now fully tested at the subsystem level and has a more maintainable architecture.
- **suggested_action:** N/A

---

## Entry: L2Y2

- **test_id:** L2Y2
- **title:** `default_handler` Feature Parity Implementation
- **component:** default_handler
- **status:** CLOSED
- **description:** Addressed multiple pending tests by implementing their corresponding features (custom markdown-it options and plugins, HTML templates, HTML injection points, `lang` attribute handling, and `omit_title_heading` logic).
- **impact:** The module is now more extensible and aligned with its L2 test specifications.
- **suggested_action:** Address the deferred test for `removeShortcodes` (2.2.2) in a future iteration.

---

## Entry: 2.3.9

- **test_id:** 2.3.9
- **title:** Redundant Test Scenario for Browser/Page Closure
- **component:** pdf_generator
- **status:** SKIPPED
- **description:** The test scenario to verify browser closure is already comprehensively covered by assertions in other error-handling and success-path tests (2.3.1, 2.3.6, 2.3.7, 2.3.8).
- **impact:** None. Functionality is already verified.
- **suggested_action:** None needed. Test is skipped to avoid redundancy.

---

## Entry: 2.4.1

- **test_id:** 2.4.1
- **title:** Validator "Happy Path" Test Blocked by Scaffolder
- **component:** plugin-validator
- **status:** CLOSED
- **description:** The `plugin create` command does not yet generate a fully compliant plugin out-of-the-box (it omits the `test/` directory and `schema.json`), preventing the "happy path" validator test from passing without a custom fixture.
- **impact:** A user cannot immediately validate a freshly created plugin.
- **suggested_action:** The E2E test now bypasses this by programmatically creating a compliant fixture. The `plugin create` command should be improved in the future.

---

## Entry: 2.4.4

- **test_id:** 2.4.4
- **title:** Metadata Precedence: `.schema` > `.config` > `README`
- **component:** plugin-validator
- **status:** CLOSED
- **description:** This test is obsolete. The plugin metadata fields (`protocol`, `plugin_name`, `version`) are now required to be present exclusively in `<plugin>.config.yaml` at the root. The previous metadata precedence (schema, config, README) is no longer supported or relevant.
- **impact:** The scenario is not possible under the current contract; validator logic and documentation have been updated to reflect this simplification.
- **suggested_action:** Remove or permanently skip this test. Ensure all metadata validation relies solely on the config YAML file.

