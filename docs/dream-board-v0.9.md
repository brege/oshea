# Dream Board: v0.9 - Standardization Phase

## Standardization & Stability

The ongoing overhaul of the test suite, initially slated for v0.8.9, has revealed a larger opportunity. 
The work done is foundational and represents maturation of the project. 
Therefore, v0.9 will be dedicated to **Standardization**. 
We focus this release on creating a stable, reliable, and extensible codebase by formalizing testing procedures, configuration, and the plugin architecture. 

---

### Table of Contents
- [Core Theme: Standardization & Stability](#core-theme-standardization--stability)
- [1. Test Suite Standardization & E2E Implementation](#1-test-suite-standardization--e2e-implementation)
  - [1.1. Implement a Centralized Mocha Configuration | T0](#11-implement-a-centralized-mocha-configuration-t0)
  - [1.2. Define and Implement Level 3 E2E Tests | T4](#12-define-and-implement-level-3-e2e-tests-t4)
- [2. Plugin Architecture Standardization](#2-plugin-architecture-standardization)
  - [2.1. The Plugin Contract & In-Situ Testing | T2](#21-the-plugin-contract--in-situ-testing-t2)
  - [2.2. Configuration and Plugin Schema Validation | T3](#22-configuration-and-plugin-schema-validation-t3)
- [3. Core Module Stability](#3-core-module-stability)
  - [3.1. `default_handler` Parity | T1](#31-default_handler-parity-t1)
- [4. Future-Proofing & AI Integration](#4-future-proofing--ai-integration)
  - [4.1. AI-Assisted Plugin Scaffolding | T5](#41-ai-assisted-plugin-scaffolding-t5)
- [v0.9 Order of Implementation](#v09-order-of-implementation)
  - [Bookend Tasks (Immovable)](#bookend-tasks-immovable)
  - [Core Development Tasks (Permutable)](#core-development-tasks-permutable)
- [Legend -- Tasks Summary](#legend----tasks-summary)
- [v0.9 Standardization Task Permutation Table](#v09-standardization-task-permutation-table)
- [Conclusions](#conclusions)


---

## 1. Test Suite Standardization & End-to-End Implementation

The previous testing strategy was brittle and difficult to maintain.
The new strategy, with its tiered levels, Level 0, 1, 2, and 3, provides comprehensive coverage.
The focus for v0.9 is to complete this transition and establish a clear, sustainable testing framework for the future.

### 1.1. Implement a Centralized Mocha Configuration | T0

To eliminate hardcoded paths in `package.json` and streamline test execution, we will implement a central Mocha configuration file (e.g., `.mocharc.js`).

- **Objective**  
  Create a single source of truth for test configuration.
- **Key Features**
  - Use glob patterns (`test/level-0/**/*.test.js`, `plugins/**/*.e2e.test.js`) to automatically discover tests.
  - Define scripts or configurations to easily run specific test levels (e.g., `npm test -- --grep "L0"` or separate scripts like `npm run test:l0`, `npm run test:e2e`).
  - Specify setup files, reporters, and timeouts in one place.

This will massively simplify the process of adding new tests and modules. 
A new test file that follows the naming convention will be picked up automatically, requiring no changes to `package.json`.

### 1.2. Define and Implement Level 3 E2E Tests | T4

The Level 1 and 2 tests provide excellent coverage of our modules and subsystems. The Level 3 End-to-End (E2E) tests validate the complete user experience from the command line, ensuring all parts of the application work together correctly and provide a bat-signal ahead of high-level regressions.

**Objective**\
To create a manageable and high-value suite of E2E tests that verify workflows. Our strategy is not to test every possible permutation, but to define a **basis set** of tests that provides maximum confidence with minimal redundancy.

**Core Testing Philosophy**\
We will systematically select tests for each command by covering five key dimensions:
 1. **The "Happy Path"** -- The single, most common, successful use-case for a command with default settings.
 2. **Options & Flags** -- Critical, orthogonal flags are tested in isolation to verify their specific functionality without causing a combinatorial explosion of test cases.
 3. **Input Variations** -- We test representatives from distinct categories of input (e.g., markdown with and without front matter) to trigger different internal logic.
 4. **Configuration Precedence** -- Targeted tests to confirm that the configuration hierarchy (CLI > front matter > local > global) is respected.
 5. **Expected Failures / "Sad Paths"** -- Verifies that the application fails gracefully and predictably with invalid inputs or options.

**Test Architecture and Structure**

To support this strategy, our testing architecture is organized as follows:

**Standardized Directory Structure**\
The `test/` directory is organized to clearly separate test types and provide a home for reusable test data.
```
test/
├── e2e/          # Level 3 E2E Tests (CLI runners & manifests)
├── integration/  # Level 1 & 2 Tests (module & subsystem)
└── fixtures/     # Reusable test data (mock files, configs, plugins)
```
**Dedicated Fixture Files**\
All test data (markdown content, configurations, mock plugins) will be maintained in the `test/fixtures/` directory. This mirrors real-world usage, promotes reusability, and keeps test logic separate from test data. Tests can mix and match these fixtures to create complex scenarios, such as ad-hoc plugins for specific test cases.

**Reusable Test Harness `test/e2e/harness.js`**\
A central harness provides sandboxing (creating/cleaning temporary directories) and a programmatic way to execute the CLI and capture its output: `exitCode`, `stdout`, `stderr`.

**Assertion Best Practices**\
To ensure our tests are robust and not brittle, we will adhere to a strict assertion policy:
 
 * **Assert on Verifiable Outcomes**\
   The primary assertions will always be on `exitCode` and file system state (e.g., a file was created, a directory was removed).
 
 * **Use Patterns, Not Exact Strings**\
   When checking `stdout` or `stderr` is necessary, we will use regular expressions to search for key patterns. This prevents tests from failing due to trivial whitespace or wording changes.
   * **Good:** `/Successfully created/.test(stdout)`
   * **Forbidden:** `expect(stdout).to.include('Successfully created')`

---

## 2. Plugin Architecture Standardization

If there is any hope in fostering a healthy plugin ecosystem, we should ideally define a clear contract for what constitutes a valid plugin.

### 2.1. The Plugin Contract & In-Situ Testing | T2

**Objective**\
Define a formal "Plugin Contract" and require basic tests to ship with every plugin.

**Actions**
 1. **Co-locate Tests**\
    Move the E2E tests for bundled plugins into their respective folders, such as:\
    `test-old/test-cases/convert-command.test-cases.js:cv` → `plugins/cv/cv.e2e.test.js`.
 
 2. **Enforce the Contract**\
    A plugin will be considered valid only if it adheres to the following structure and includes a passing test.
    - `plugins/{plugin-name}/index.js` (main logic)
    - `plugins/{plugin-name}/{plugin-name}.config.yaml` (default configuration)
    - `plugins/{plugin-name}/{plugin-name}-example.md` (example usage file)
    - `plugins/{plugin-name}/{plugin-name}.e2e.test.js` (a simple, passing E2E test)
    - `plugins/{plugin-name}/README.md` (updated to explain the plugin and the testing standard)

### 2.2. Configuration and Plugin Schema Validation | T3

**Objective**\
Introduce schema validation for all configuration files to provide better error feedback to users.

**Actions**
1. **Project `config.yaml` Schema**  
   Define a JSON Schema for the root `config.yaml` file.
2. **Plugin `config.yaml` Schema**  
   Each plugin's `config.yaml` will also have its own schema.

**Validation Step**\
The application will validate all loaded configuration files against their respective schemas at runtime, providing clear, human-readable errors for malformed configurations.

---

## 3. Core Module Stability

### 3.1. `default_handler` Parity | T1

**Objective**\
Ensure the `default_handler` provides a reliable and predictable baseline experience.

**Problem**\
Currently, about half of the `default_handler` tests are failing due to a departure from the base assumptions of the underlying Markdown and PDF generation libraries.

**Action**\
Prioritize fixing all tests for the `default_handler`. This may involve creating a thin abstraction layer over Puppeteer or `markdown-it` to ensure our application's expectations are met consistently. This handler is the fallback for all conversions and *must* be 100% reliable.

---

## 4. Future-Proofing for AI generated plugin code

The ultimate goal of standardization is to create a platform so robust and predictable that it can be programmatically extended.
This combines a practical and reproducible document generation workflow that is systematically compatible with ever-evolving agentic capabilities.

### 4.1. LLM-Assisted Plugin Scaffolding | T5

**Objective**\
Define a clear interaction specification that allows AI models to reliably generate new, working plugins.

**Thoughts**\
A user, such as a teacher, could provide a simple prompt like this:

    Create a plugin for a simple pendulum physics demonstration. 
    It should have sections for theory with LaTeX equations, an 
    interactive toy diagram, and a section for a few sample
    problems.
Assisted with an interaction spec, could an AI then be initialized to use the project's archetyping to generate all necessary files?\
`README.md`, `index.js`, `*.config.yaml`, `*.css`, `*-example.md`, `test/*.e2e.test.js`, etc.

**Actions**
 1. **Interaction Specification**\
    Document the precise inputs, outputs, and APIs of the plugin system.
    This goes beyond the user-facing `plugin-development.md` and details the internal mechanics in a way an LLM can parse.
 2. **Refine Plugin Archetype Command**\
    Adapt the `plugin create` command to be more machine toolable by providing a well-commented skeleton that can be reasonably populated.
 3. **Create an Example Prompting Guide**\
    Develop a document, say `docs/prompt-example-guide.md`, that shows users how to effectively initialize context windows to build a plugin for this system, providing a few real-world examples.

     *Wedding invitations* and *Thank You Cards* could, perhaps, be sexy examples, as these are creatively hard to produce in existing document systems.  The disposability of interaction windows offer iterative content creation opportunities. 


## v0.9 Order of Implementation -- Multi-Task Approach

Let's explore the order of execution for these standardization tasks, and consider their flexibility and feasibility.

At the beginning, these tasks seem daunting, as we are still haunted and scarred from the old, deprecated, brittle E2E tests.
A methodical approach is worth the time to map out. 
I don't want to be constantly fighting failing tests.

#### Bookend Tasks -- Immovable

**[T0](#11-implement-a-centralized-mocha-configuration-t0) | `1.1` | Mocha Configuration**
  |     |     |
  | --- | --- |
  | **Description** | Implement a central Mocha configuration file `.mocharc.js` to streamline test execution and eliminate hardcoded paths.
  | **Placement** | Must be done first to enable the rest of the testing workflow.

**[T5](#41-ai-assisted-plugin-scaffolding-t5) | `4.1` | AI Integration**
  |     |     |
  | --- | --- |
  | **Description** | Develop the interaction specifications and guides to enable AI-assisted plugin scaffolding.
  | **Placement** | Must be done last, as its structure is directly transferable from the standardization tasks being completed.

#### Core Development Tasks -- Permutable

**[T1](#31-default_handler-parity-t1) | `3.1` | Core Stability**
  |     |     |
  | --- | --- |
  | **Description**  | Achieve 100% test pass rate for the `default_handler` module (L0-L2 tests) to ensure a stable foundation. 
  | **Alias**  |`default_handler Parity` 

**[T2](#21-the-plugin-contract--in-situ-testing-t2) | `2.1a` | Plugin Contract**
  |     |     |
  | --- | --- |
  | **Description** |Define the human-readable rules, directory structure, and documentation standards for what constitutes a valid plugin. 
  | **Alias** | `Define Contract` 

**[T3](#21-the-plugin-contract--in-situ-testing-t2) | `2.2` | Schema Formalization**
  |     |     |
  | --- | --- |
  | **Description** | Create the machine-readable JSON Schemas for `config.yaml` and plugin configurations to enforce the contract's rules programmatically.
  | **Alias** | `Config/Plugin Schema`

**[T4](#12-define-and-implement-level-3-e2e-tests-t4) | `1.2` \& `2.1b` |  E2E Implementation**
  |     |     |
  | --- | --- |
  | **Description** | Write the high-level End-to-End tests, including porting valuable old tests and creating new in-situ tests for plugins.
  | **Alias** | `E2E Tests`


### Legend -- Condensed Tasks Summary
| Task #                                                        | Description                     |
|:-------------------------------------------------------------:|:--------------------------------|
| [**T0**](#11-implement-a-centralized-mocha-configuration-t0)  | Mocha Adoption & Configuration  |
| [**T1**](#31-default_handler-parity-t1)                       | Core Stability                  |
| [**T2**](#21-the-plugin-contract--in-situ-testing-t2)         | Plugin Contract                 |
| [**T3**](#22-configuration-and-plugin-schema-validation-t3)   | Schema Formalization            |
| [**T4**](#12-define-and-implement-level-3-e2e-tests-t4)       | E2E Testing                     |
| [**T5**](#41-ai-assisted-plugin-scaffolding-t5)               | AI Integration                  |


### v0.9 Standardization Task Permutation Table


The following table covers all 24 possible sequences of the remaining development tasks. 

***Goal:** identify the most logical, lowest-risk, and flexible--**pivotable**--pathway for v0.9 standardization*

|  # |<span style="white-space:nowrap">**Step 1**</span> |<span style="white-space:nowrap">**Step 2**</span> |<span style="white-space:nowrap">**Step 3**</span> |<span style="white-space:nowrap">**Step 4**</span> | Difficulty     | Remarks             |
|---:|:-----|:-----|:-----|:-----|:---------------|:--------------------|
| <span style="white-space:nowrap">**Core Stability - `src/`**</span> | [**T1**](#31-default_handler-parity-t1) |
| 1  |**T1**|**T2**|**T3**|**T4**| **Low**        | **foundation first**, test last  |
| 2  |  T1  |  T2  |  T4  |  T3  | **Medium**     | E2E tests will likely require rewrite after schema  |
| 3  |**T1**|**T3**|**T2**|**T4**| **Low**        | formalize rules (schema) as you define them (contract)  |
| 4  |  T1  |  T3  |  T4  |  T2  | **Medium**     | <span style="white-space:nowrap">write E2E tests on top of a schema w/o a human-readable contract is awkward</span>  |
| 5  |  T1  |  T4  |  T2  |  T3  | **High**       | write E2E tests on a stable core w/ neither contract nor schema  |
| 6  |  T1  |  T4  |  T3  |  T2  | **High**       | same as #5  |
| <span style="white-space:nowrap">**Contract - `plugins/`**</span>| [**T2**](#21-the-plugin-contract--in-situ-testing-t2) |
| 7  |**T2**|**T1**|**T3**|**T4**| **Low-Med**    | logical but T4 work will be blocked until T1 is done  |
| 8  |**T2**|**T3**|**T1**|**T4**| **Low-Med**    | most logical **contract first** path--fix core **on top** of plugin contract  |
| 9  |  T2  |  T3  |  T4  |  T1  | **Very High**  | writing E2E tests on shaky foundation + T1 last = refactor noise  |
| 10 |  T2  |  T4  |  ..  |  ..  | **Very High**  | ..  |
| 11 |  T2  |  T1  |  T4  |  T3  | **High**       | similar to #7 will require test rework  |
| 12 |  T2  |  T4  |  T1  |  T3  | **Very High**  | same as #9/#10  |
| <span style="white-space:nowrap">**Schema - `*.json`** </span>  | [**T3**](#22-configuration-and-plugin-schema-validation-t3) |
| 13 |**T3**|**T2**|**T1**|**T4**| **Low-Med**    | **formalist** approach--schema first, less natural than T2 → T3.  |
| 14 |**T3**|**T1**|**T2**|**T4**| **Low-Med**    | ..  |
| 15 |  T3  |  ..  |  ..  |  T1  | **Very High**  | any T4 → .. → T1 scheme is fundamentally flawed  |
| 16 |  T3  |  T4  |  ..  |  ..  | **Very High**  | ..  |
| 17 |  T3  |  T2  |  T4  |  T1  | **Very High**  | ..  |  
| 18 |  T3  |  T1  |  T4  |  T2  | **High**       | schema on top of stable core is ok, but tests are brittle  |
| <span style="white-space:nowrap">**E2E Tests - `test/`**</span>  | [**T4**](#12-define-and-implement-level-3-e2e-tests-t4) |
| 19 |  T4  |  ..  |  ..  |  T1  | **Unfeasible** | any T4 → .. → T1 scheme is **fundamentally flawed**  |
| 20 |  T4  |  T1  |  T2  |  T3  | **Very High**  | ..  |
| 21 |  T4  |  T1  |  T3  |  T2  | **Very High**  | ..  |
| 22 |  T4  |  T2  |  T1  |  T3  | **Very High**  | ..  | 
| 23 |  T4  |  T2  |  T3  |  T1  | **Unfeasible** | .. *and* impossible to debug  |
| 24 |  T4  |  T3  |  ..  |  ..  | **Unfeasible** | .. *and* impossible to debug  |

### Final Plan

Clearly, any implementation that does not **put T4 last** is much more difficult to implement.

The easiest pathway is **T1 → [T2 ↔ T3] → T4**, but any form of **[T1 ↔ T2 ↔ T3] → T4** is relatively feasible.

**Recommendation for myself**\
Try starting with **T1** to fix the core tests.
If you get stuck, formulate the plugin contract for **T2**.
You can also draft plans for schema (**T3**) colinearly.
Would not hurt to at least plot out the E2E test set.

Basically, I could "sliderule" the **T?**'s over these:
[ **Develop Code** | **Draft Code** | **Write Plan** | **Online Plan** ]
to dissipate the all-too predictable accretion of content fatigue on my continued self-interest.


### Actual Outcome -- Live Checklist: T0 ➜ T4 

| Task #  | Phase    | Outcome                                                                        |
|:-------:|:---------|:-------------------------------------------------------------------------------|
| **T0**  | ✔ coded  | `.mocharc.js` and `test/runner.js` implemented                                 |
| **T1**  | ✔ coded  | `test/default-handler/*.test.*.js` now at parity                               |
| **T3**  | ✔ coded  | 1. pilot `cv`, `{base-plugin, plugins/cv/cv}.schema.json`                      |
| **T2.1**| ✔ coded  | 2. in-situ tests `plugins/*/test/**-e2e.test.js`                               |
| **T2.2**| ✔ coded  | 3. `config.yaml` and `docs/plugin-contract.md` set values                      |
| **T2.3**| ✔ coded  | 4. `src/plugin-validator.js` implemented                                       |
| **T2.4**| ✔ coded  | 5. refactor: `src/plugin-validator.js` dispatches `src/plugin-validator/v?.js` |
| **T2.5**| ✔ coded  | 6. validation by self-activation tests `src/plugin-validator.test.js`          |
| **T2.6**| ✔ coded  | 7. `test/plugin-validator/*.test.js` test the validator module                 |
| **T4.1**| ✔ coded  | 8. `test/e2e/*.{manifest,test}.js`,`harness.js`, `factory function`            |
| **T4.2**| ○ think  | ...*tab-completion can will people learn a new CLI*...                         |
| **T5**  | ● active | [**in progress**](#t5--outline-prequisites-as-a-checklist)                     |

\
We took a hybrid approach for the **[T2 ↔ T3]** phases:
 
 1. ✔ implement a schema for a pilot plugin `cv`
 2. ✔ write in-situ tests for a pilot plugin `cv` 
 3. ✔ write a general contract for a plugin
 4. ✔ write in-situ tests for all bundled plugin
 5. ✔ create a validator that checks:
    - ✔ it validates a plugin against the contract
    - ✔ it passes its in-situ E2E test
    - ✔ for a valid schema
 6. ✔ write (subsystem) tests for the validator itself **(B)**
    - ✔ prepare checklist for these tests
    - ✔ implement the tests
    - ✔ all tests pass
 7. ✔ checks README front matter for {plugin-name} and {version}
 8. ✔ write self-activation tests for the validator to run *against* a plugin **(A)**
 
 We paused work at this point to hop to **T4**. These implementations are to be tended to after **T4**'s completion:

 9. ○ update archetyper to produce schema, e2e test, and pin 
    `protocol` / `plugin-name` / `version` to front matter **(C\)**
10. ○ `plugin add/enable` could use the validator to validate new plugins 
11. ○ `collection update` could use the validator to verify updated plugins

**note** -- be careful with the degeneracy of terminology:
 - ✔ **A)** need to add a validation check for a plugin using a new test prototype (self-activation test)
 - ✔ **B)** need **module/subsystem** tests for the validator itself
 - ○ **C)** need to add a test template in `plugins/template-basic` for the archetyper to populate on
 - **{A, B, C} are three distinct items**

#### Checklist Key
| Type   | Meaning           |
|:------:|:------------------|
| **✔**  | Completed         |
| **×**  | Incomplete        |
| **➜**  | In Progress       |
| ● / ○  | Active / Inactive |
| **..** | No thoughts yet   |


---

### Initial Tasks

 - ✔ **T0** | Implement a Centralized Mocha Configuration [T0]  **easy**
 - ✔ **T1** | All **core** tests pass (most work is for the Default Handler Module) [T1]  **easy**
 - ✔ **T3** | Implement the schema for a Pilot Plugin [T3]  **medium**

The third task is a little more involved.  

---

### Final Trilogy of Tasks

 - ✔ **T0 ➜ T3**  | Checkpoint: Current Test Suite Status
 - ✔ **T4**       | Implement the E2E manifest testing procedure 
 - ➜ **T5**       | Outline prequisites as a checklist

### T0 ➜ T3 | Checkpoint: Current Test Suite Status

This is a snapshot of all test scenarios that are not currently passing, grouped by their implementation status.

[`./scripts/find-missing-tests.js`](../scripts/find-missing-tests.js)

This tool:

 1. Determines from the checklists 
      
    - [`test/docs/test-scenario-checklist-Level_1.md`](../test/docs/test-scenario-checklist-Level_1.md)
    
    - [`test/docs/test-scenario-checklist-Level_2.md`](../test/docs/test-scenario-checklist-Level_2.md)
    
    which tests do not yet have corresponding test files: `[ ]`, `[S]`, `[?]`
 
 2. Determines via `it.skip()` and `descibe.skip()` which tests have files, but are disabled. 
    Then, each is linked to an existing audit log entry.


#### 1. Pending Scenarios (Missing Implementation Files)

These scenarios are defined in the checklists but do not yet have corresponding test files.


| Code   | Test Scenario          | Description                                                       |
|:------:|:-----------------------|:------------------------------------------------------------------|
| `L1Y7` | **`math_integration`** | **nice-to-have** entire test suite is pending--low-priority       |
| `L2Y3` | **`pdf_generator`**    | **only `2.3.9`** `[S]` functionality is covered by other tests    |

#### 2. Implemented but Skipped Tests (Requires Refactoring)

These scenarios have test files, but the tests are disabled with `.skip()` due to known limitations in the source code. Each is linked to an existing audit log entry.


| Code     | Test Scenario  | Issue  | Reason  |
|:---------|:---------------|:---------|---------|
|**1.1.2** | `ConfigResolver` | caching | The caching/rebuild logic is not implemented due to a non-re-entrant design in `_initializeResolverIfNeeded` |
|**1.2.4** | `PluginRegistryBuilder` | tilde path resolution | Skipped due to brittle and unreliable mocking of `os.homedir` in the test environment.|
|**1.2.8** | `PluginRegistryBuilder` | ... | ... |
|**1.2.24**| `PluginRegistryBuilder` | caching | The `buildRegistry` caching mechanism is not functioning as intended and fails to return cached results. |
|**1.3.2** | `plugin_determiner` | front matter override | Skipped due to a subtle and unresolvable mock failure where `localConfigOverrides` consistently returns `null`.|
|**1.4.14**| `main_config_loader` | config loading logic | Skipped due to a conflict with the module's prioritization logic and inconsistent `console.warn` behavior.|
|**1.4.15**| `main_config_loader` | ... | ... |
|**2.2.2** | `default_handler` | shortcode removal | Skipped because the regex-based shortcode removal is not effective enough for reliable testing.|

#### 3. Ongoing Tasks

See the [**T2 ➜ T3 Actual Outcome**](#actual-outcome) checklist and numbered notes.


### T3 ➜ T4 | 1. ) A decision on the broader order of remaining tasks

The **T4** implementation can be done now, but there are still many tasks left to do.
Very generally speacking, these epochs are

- **T3.x**: Implement the new `plugin validate` integration tests
- **T3.y**: Pare down the 'Implemented but Skipped' and `math` integration tests
- **T4**: Begin implementing the E2E testing procedure

This doesn't require a permutation matrix, but you could construct one like:

|          |          |        | difficulty      | vibe |
|:--------:|:--------:|:------:|:----------------|:-----|
|**T3.x**  |**T3.y**  |**T4**  | **High**        | prefectionism, but chronological |
|**T3.y**  |**T3.x**  |**T4**  | **Medium**      | bring new tests to status parity of L1/L2 tests |
|**T3.y**  |**T4**    |**T3.x**| **Low**         | adds new L2 tests first, then L3 framework tests |
|**T3.x**  |**T4**    |**T3.y**| **High**        | minimizes debt, structure oriented |
|**T4**    |**T3.x**  |**T3.y**| **No Benefit**  | schizo |
|**T4**    |**T3.y**  |**T3.x**| **Low**         | adds new L3 test framework first |

The pathway **T4 ➜ T3.x ➜ T3.y** and **T3.x ➜ T4 ➜ T3.y** are the most logical.

**Here is why:**

The `plugin-validator` test (L2Y4) is an ideal candidate for the T4 harness because its purpose is to validate a plugin's behavior from the outside-in, including running child processes like `mocha` and the `cli.js` itself. 

Using the harness to test these system-level interactions is more direct and less brittle than attempting to mock them. Conversely, existing L2 tests for modules like `default_handler` should not be backported, as their purpose is different: they surgically test the internal "white-box" orchestration *between* modules, which requires the precision of stubs. 

**This hybrid strategy ensures we use the right testing style for the right job--a harness for external system validation and stubs for internal logic verification.**

**Conclusion: [T4 ↔ T3.x] ➜ T3.y** is the ideal logical progression.

This approach makes final the total map of tests for all logic belonging to the planned v1.0 release.
This will provide a measure of coverage during the *release candidate* (**rc**) phase of finalization.

Having some non-breaking bugs that touch multiple layers could act as a means of intentional incompleteness, as it would bring me more abreast of the clicking of the gears while polishing the body of the watch. The more I think about the permutation matrix, the gladder I am about the choice of path.

#### Sidebar: how can we execute `plugin validate` tests?

Let's **illustrate** how enforcing the rules of the **protocol** affects
the enforcement of the **contract**.  For illustration, let's say
 - a **v1**-valid plugin is required to have a sane file structure
 - a **v2**-valid plugin is required to have a sane file structure and E2E tests
 - a **v3**-valid plugin is required to have *in-situ* tests and *self-activation* tests, but no longer requires a sane file structure, because the self-activation test implicitly checks for a sane file structure 

| Protocol | File Structure Check | E2E Test Check | Self-Activation Check | How it's Implemented in the "Plugin Contract" Service |
| :--- | :---: | :---: | :---: | :--- |
| **v1** | **Required** | Ignored | Ignored | Logic is defined in `v1.js`. |
| **v2** | **Required** | **Required** | Ignored | `v2.js` **imports** the structure check from `v1.js` and adds the new test check. |
| **v3** | Ignored | **Required** | **Required** | `v3.js` **imports** the test check from `v2.js`, adds the new self-activation check, and **omits** the structure check. |


This presciently informs us that in order for the L2Y4 testing to work (which will use the T4 architecture, as it's a very special case warranting that tooling), we need to break the validator down into stages for specifically the above purpose.

You cannot run self-activation tests on mocked dummy files. You need to check if certain *stages* are valid for this targeted tests to work, and to make the subcommand-matrix separable. 
We do not want to be stuck relying on one command to execute the others.
The **L2Y4** test should be **composable** and **extendable**. 

###  T3 ➜ T4 | 2. ) The Bridge to Systemizing End-to-End Testing

The primary goal of the T4 phase is to build a methodical, automated test suite that validates the application. This involves running the `cli.js` command with a variety of arguments and asserting that the application's behavior--including file outputs, console messages, and exit codes--is correct.

<details>
<summary><strong>Systemizing End-to-End Testing</strong></summary>

#### 1. The E2E Test Harness

To do this efficiently, we'll first build a small, reusable testing "harness." This will live in a new `test-e2e/` directory to keep it separate from the existing module integration tests.

The harness will consist of a helper module (`test-e2e/harness.js`) that provides foundational tools for every E2E test.

**`test-e2e/harness.js` Skeleton**
```javascript
// const ... (libs) ...
class TestHarness {
    constructor() { this.sandboxDir = ''; }

    // Creates a clean, temporary directory for a test run
    async createSandbox() { ... }
    // returns the path to the sandbox directory

    // Executes the CLI with given arguments
    runCli(args = []) { ... }
    // returns a Promise that resolves to { exitCode, stdout, stderr }

    // Cleans up the temporary directory
    cleanup() { return fs.remove(this.sandboxDir); }
    
}

module.exports = { TestHarness };
```

#### 2. E2E Test Structure: A Hybrid Approach

We will use two complementary strategies for our E2E tests, both driven through the harness.

**A. Data-Driven Smoke Tests**

For simple commands, we can use a manifest file to test a wide range of inputs and expected outputs without writing repetitive test code.

**`test-e2e/command-manifest.json` Skeleton**
```json
[
  {
    "description": "Should show the main help text",
    "args": ["--help"],
    "expectInStdout": "Usage: cli.js [command] [options]"
  },
  {
    "description": "Should fail gracefully for a non-existent command",
    "args": ["non-existent-command"],
    "exitCode": 1,
    "expectInStderr": "Unknown command: non-existent-command"
  }
]
```

**B. Scenario-Driven Workflow Tests**

For complex, multi-step user stories, we'll write dedicated test files. These provide the clarity needed to test a full workflow from start to finish.

**`test-e2e/collections.test.js` Skeleton**
```javascript
// ...
describe('E2E - Plugin and Collection Management', function() {

    beforeEach( ... )
    // creates a clean sandbox

    afterEach( ... )
    // cleans up the sandbox

    it('should allow adding, enabling, using, and removing a plugin', async () => { ... });
    // performs a series of steps
        
});
```

#### 3. Housekeeping: Reorganizing the `test/` Directory

As we introduce the `test-e2e/` directory, it presents a perfect opportunity to improve the project's overall structure for long-term clarity and maintainability.

#### Current Structure
```
test/
├── collections-manager/
├── config-resolver/
├── default-handler/
└── ... (all T0-T3 tests)
```

#### Proposed Structure
```
test/
├── e2e/
│   ├── collections.test.js
│   ├── harness.js
│   └── ...
└── integration/
    ├── collections-manager/
    ├── config-resolver/
    ├── default-handler/
    └── ...
```

#### Why this is a good idea

1. **Clarity and Convention**\
   This structure is self-documenting and conventional. New contributors can more quickly grok the distinction between different tests. Putting in all of the work to generate these tests, then failing to make it easy to know which tests do what isn't exactly anethema to achieving the greater goal: accuracy.

2. **Simplified Maintenance (The "Pain" of Waiting)**\
  Test configuration files, like `.mocharc.js`, are a form of documentation that codifies your project's structure. If we reorganize later, we would have to hunt down every reference to the old paths and update them. 
  Further, we would likely be producing a new document to describe the test structure.  
  Doing it *now* avoids refactoring debt.

3. **Focused Test Execution**\
   This structure makes it trivial to run *all* tests of a certain type. For example, in your `.mocharc.js`, the configuration becomes beautifully simple:
   ```javascript
   const groups = {
       // ... other groups
       integration: ['test/integration/**/*.js'],
       e2e: ['test/e2e/**/*.js']
   }
   ```
   This is cleaner and less error-prone than maintaining a long list of individual module paths for a single group.

</details>

The above, toggled has since been implemented in full.
The following section is thusly focused on **Level 3** end-to-end testing.

### T4 | E2E Testing Integration

Our strategy is not to test every possible permutation, but to define a **basis set** of tests that provides maximum confidence with minimal redundancy. 

To achieve this efficiently, the testing architecture combines a reusable `TestHarness` for sandboxing, a `test-runner-factory` to eliminate boilerplate, and manifest files to clearly define test cases for each command. This approach proves invaluable, as implementing the suite becomes a powerful final validation of the entire application, uncovering subtle bugs that only appear during full end-to-end execution.

#### Global Options

| Option | Description |
| :-- | :-- |
| `--config <path>` | Specifies a path to a global configuration file |
| `--version` | Shows the version number |
| `--help` | Shows the help screen |


---

#### Command Matrix

| Command | Subcommand | Positional(s) | Options/Flags | Notes/Details |
| :-- | :-- | :-- | :-- | :-- |
| `convert` | -- | `<file>` (Required) | `--plugin, -p`<br>`--outdir, -o`<br>`--filename, -f` | Default command (`$0`) |
| `generate` | -- | `<plugin>` (Required) | *(Dynamic options from plugin.config.yaml)* | Plugin-specific options loaded at runtime |
| `config` | -- | -- | `--plugin, -p`<br>`--pure` | Shows merged config for a plugin |
| `plugin` | `list` | -- | `--enabled`<br>`--disabled`<br>`--available`<br>`--all` | `--all` is default |
| `plugin` | `create` | `<plugin_name>` (Required) | `--from <source_plugin>`<br>`--target-dir <path>`<br>`--force` | Archetype from existing plugin, set target dir, force overwrite |
| `plugin` | `add` | `<path>` (Required) | -- | Add and enable a singleton plugin directory |
| `plugin` | `enable` | `<plugin_ref>` (Required) | -- | Reference: `collection_name/plugin_id` |
| `plugin` | `disable` | `<invoke_name>` (Required) | -- |  |
| `plugin` | `validate` | `[path]` (Optional) | `--schema <version>` | Defaults to current directory if no path provided |
| `collection` | `add` | `<source>` (Required) | -- | Source can be git URL or local path |
| `collection` | `list` | -- | -- |  |
| `collection` | `remove` | `<name>` (Required) | -- |  |
| `collection` | `update` | `[name]` (Optional) | -- | If omitted, updates all collections |
| `update` | -- | `[name]` (Optional) | -- | Alias for `collection update` |

---

The successful implementation of this test plan provides a strong guarantee of the tool's stability. While more complex workflows--such as `--watch` mode and complex CLI lifecycles--have been documented in a so-called *Level 4 checklist* for release candidacy, the core functionality is now, I believe, well validated.

#### **Legend**

- **Command** -- Top-level command (or alias).
- **Subcommand** -- If present, the subcommand under the command.
- **Positional(s)** -- Required or optional positional arguments.
- **Options/Flags** -- All available flags for the command/subcommand.
- **Notes/Details** -- Usage notes, defaults, or dynamic behavior.

---


### T5 | Outline Prequisites as a Checklist

<details>
<summary><strong>Expanded Prerequisites Checklist</strong></summary>

#### **Plugin Scaffolding**
*`plugin create`, `collection archetype`*

* **Primary Prerequisites**
  * **✔** `plugin_scaffolder.js`: The core module responsible for orchestrating file and directory creation exists.
  * **✔** `collections-manager`: The tested subsystem for managing plugin collections where new plugins will be placed is complete.
  * **✔** CLI Command Boilerplate: The command files (`createCmd.js`, `archetypeCmd.js`) that will invoke the scaffolder are already in place.

* **Secondary Prerequisites**
  * **✔** Base Plugin Template: A foundational plugin (`template-basic`) exists to be used as a source for scaffolding new plugins.

#### **Schema & Validation Improvements**
*Hardening the `plugin-validator`*

* **Primary Prerequisites**
  * **✔** `plugin-validator.js`: The core validation dispatcher exists and is ready for its test suite to be implemented.
  * **✔** `ajv` Dependency: The underlying JSON Schema validation library is included in the project's dependencies.
  * **✔** `base-plugin.schema.json`: A base schema for plugins to extend or conform to is available.

* **Secondary Prerequisites**
  * **✔** T4 E2E Test Suite: A comprehensive E2E test suite for the `plugin validate` command is needed to harden its behavior and ensure clear error messaging.
  * **✔** Plugin Contract Documentation: A formal document outlining the requirements for a plugin exists to guide schema design.

#### **Plugin E2E Testing Integration**
*Automating E2E tests as part of the plugin contract*

* **Primary Prerequisites**
  * **✔** T4 E2E Test Harness: The core framework for sandboxing and programmatically running the CLI is a required foundation.
  * **✔** Proof-of-Concept Self-Test: The `v1.js` validator already contains a working example of how to programmatically execute a plugin's co-located E2E test.

* **Secondary Prerequisites**
  * **✔** Base E2E Test Template: A template file for a plugin's E2E test already exists as part of the basic plugin template, which can be used in scaffolding.

#### **Performance Profiling**
*Analyzing and optimizing conversion speed*

* **Primary Prerequisites**
  * **✔** Core `convert` Command: The main conversion command, the primary target for profiling, is implemented.
  * **✔** T4 E2E Test Suite for `convert`: A stable E2E test suite is needed to provide a repeatable and consistent baseline for performance measurements.

* **Secondary Prerequisites**
  * **✔** Node.js Profiling Tools: The underlying tools for performance analysis (e.g., `node --prof`) are part of the Node.js runtime.
  * **✔** Complex Test Documents: A variety of large or complex Markdown documents exist within the project to use as profiling workloads.

#### **Auto-documentation**
*Generating CLI help and plugin manifests*

* **Primary Prerequisites**
  * **✔** `PluginRegistryBuilder`: The module capable of discovering all plugins and their metadata is complete and tested.
  * **✔** `yargs` Dependency: The CLI framework, which can expose the registered command structure, is a core dependency.
  * **✔** `get_help.js`: A dedicated module for help text generation exists.

* **Secondary Prerequisites**
  * **●** Consistent Plugin `description`: The quality of auto-generated documentation will depend on the convention of having a clear and concise `description` field in each plugin's `config.yaml` file.

</details>

## v0.9 Finalization & Release Candidate Checklist | Live

With the core E2E tests implemented, this checklist outlines the remaining **hardening** tasks required to reach a stable `v1.0.0-rc.1` release.

| ✔ |        |<span style="white-space:nowrap">Plugin System Hardening</span>| Command | Value|`#`|   
|---|--------|:-----------------------------|:-----------------|:-----------------------------|---|
| ✔ | **A1** | `v1` Plugin Contract Final   |`plugin validate` | Specification & Automation   |`2`|
| ✔ | **A2** | Fully Valid Archetyping      |`plugin create`   | Feature Completeness         |`3`|
| ➜ | **A3** | Integrate Validator          |`plugin enable`   | Code Hardening               |`4`|
|   |        | <span style="white-space:nowrap">**CLI Polish & Usability**</span>       |     |   |
| ○ | **B1** | Tab Completion               |`cli.js` `<TAB>`  | User Experience Polish       |`6`|
|   |        | <span style="white-space:nowrap">**Test Suite Completion**</span>        |     |   |
| ○ | **C1** | Shrink Gaps in Test Coverage |`×L2 ×L1 ○L4 ×L3` | Technical Debt               |`5`|
| ✔ | **C2** | Housekeeping Tests & CI      |`test/integration`| Code Quality                 |`1`|

**Proposed Sequence | C2 ➜ A1 ➜ A2 ➜ A3 ➜ C1 ➜ B1**

<!--
✔
×
➜
●
○
-->
