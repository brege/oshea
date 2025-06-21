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

 9. ✔ update archetyper to produce schema, e2e test, and pin 
    `protocol` / `plugin-name` / `version` to front matter **(C\)**
10. ✔ `plugin add/enable` could use the validator to validate new plugins 
11. ×`collection update` could use the validator to verify updated plugins

**note** -- be careful with the degeneracy of terminology:
 - ✔ **A)** need to add a validation check for a plugin using a new test prototype (self-activation test)
 - ✔ **B)** need **module/subsystem** tests for the validator itself
 - ✔ **C)** need to add a test template in `plugins/template-basic` for the archetyper to populate on
 - **{A, B, C} are three distinct items**

#### Checklist Key
| Type   | Meaning           |
|:------:|:------------------|
| **✔**  | Completed         |
| **×**  | Incomplete        |
| **●**  | Active            |
| **○**  | Inactive          |
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
 - ✔ **pre T5**   | Outline prequisites as a checklist

### T0 ➜ T3 | Checkpoint: Current Test Suite Status

This is a snapshot of all test scenarios that are not currently passing, grouped by their implementation status.

~~[`./scripts/find-missing-tests.js`](../scripts/find-missing-tests.js)~~

**QA Dashboard** - [`test/scripts/qa-dashboard.js`](../test/scripts/qa-dashboard.js)

This script creates a dashboard of tests that are not yet implemented, skipped, or have audit log entries.
It synthesizes three main scenarios.

#### 1. Pending Scenarios -- Missing Implementation Files

These scenarios are defined in the checklists but do not yet have corresponding test files.

[`test/scripts/find-unchecked-tests.js`](../test/scripts/find-unchecked-tests.js)
```
1.7.4   math_integration    
4.2.1   convert --watch     
4.2.2   convert --watch
```

#### 2. Implemented but Skipped Tests -- Requires Refactoring

These scenarios have test files, but the tests are disabled with `it.skip()` due to known limitations in the source code. Each is linked to an existing audit log entry.

[`test/scripts/find-skipped-tests.js`](../test/scripts/find-skipped-tests.js)
```
1.4.14    main_config_loader    config loading logic   skipped due to a conflict with the module's prioritization logic and inconsistent `console.warn` behavior.
1.4.15    main_config_loader    ...                    ...
2.2.2     default_handler       shortcode removal      skipped because the regex-based shortcode removal is not effective enough for reliable testing.
```
#### 3. Tests with Audit Log Entries

These scenarios have entries in the audit log.

[`test/scripts/find-non-closed-tests.js`](../test/scripts/find-non-closed-tests.js)
```
1.2.31  audit-log:68    test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.31.js
1.2.32  audit-log:68    test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.32.js
1.4.14  audit-log:104   test/integration/main-config-loader/main-config-loader.test.1.4.14.js
```


#### 4. Ongoing Tasks

See the [**T2 ➜ T3 Actual Outcome**](#actual-outcome) checklist and numbered notes.


### T3 ➜ T4 | 1. A Decision on the Broader Order of Remaining Tasks

The **T4** implementation can be done now, but there are still many tasks left to do.
Very generally speacking, these epochs are

- ✔ **T3.x** | Implement the new `plugin validate` integration tests
- ✔ **T3.y** | Pare down the 'Implemented but Skipped' and `math` integration tests
- ✔ **T4**   | Begin implementing the E2E testing procedure

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

***note**: this is only an illustration*

This presciently informs us that in order for the L2Y4 testing to work (which will use the T4 architecture, as it's a very special case warranting that tooling), we need to break the validator down into stages for specifically the above purpose.

You cannot run self-activation tests on mocked dummy files. You need to check if certain *stages* are valid for this targeted tests to work, and to make the subcommand-matrix separable. 
We do not want to be stuck relying on one command to execute the others.
The **L2Y4** test should be **composable** and **extendable**. 

###  T3 ➜ T4 | 2. The Bridge to Systemizing End-to-End Testing

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

The above toggle has since been implemented in full.
The following section is mostly focused on **Level 3** end-to-end testing.

### T4 | E2E Testing Integration

Our strategy is not to test every possible permutation, but to define a **basis set** of tests that provides maximum confidence with minimal redundancy. 

To achieve this efficiently, the testing architecture combines a reusable `TestHarness` for sandboxing, a `test-runner-factory` to eliminate boilerplate, and manifest files to clearly define test cases for each command. This approach proves invaluable, as implementing the suite becomes a powerful final validation of the entire application, uncovering subtle bugs that only appear during full end-to-end execution.

---

#### Global Options

| Option               | Description |
| :------------------- | :---------- |
| `--config <path>`    | Specifies a path to a global configuration file (hierarchical) |
| `--coll-root <path>` | Specifies a path to a directory of plugins (context switch) |
| `--version`          | Shows the version number |
| `--help`             | Shows the help screen |


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

### pre T5 | Outline Prequisites as a Checklist

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

---

## T4 ➜ T5 | v0.9 Finalization & Release Candidate Checklist | Live

With the core E2E tests implemented, this checklist table outlines the remaining **hardening** tasks required to reach a stable `v1.0.0-rc.1` release.

| ✔ |        |<span style="white-space:nowrap">Plugin System Hardening</span>| Command | Value|`#`|   
|---|--------|:-----------------------------|:-----------------|:-----------------------------|---|
| ✔ | **A1** | `v1` Plugin Contract Final   |`plugin validate` | Specification & Automation   |`2`|
| ✔ | **A2** | Fully Valid Archetyping      |`plugin create`   | Feature Completeness         |`3`|
| ✔ | **A3** | Integrate Validator          |`plugin enable`   | Code Hardening               |`4`|
|   |        | <span style="white-space:nowrap">**CLI Polish & Usability**</span>       |     |   |
| × | **B1** | Tab Completion               |`cli.js` `<TAB>`  | User Experience Polish       |`-`|
|   |        | <span style="white-space:nowrap">**Test Suite Completion**</span>        |     |   |
| ✔ | **C1** | Shrink Gaps in Test Coverage |`✔L2 ✔L1 ●L4 ✔L3` | Technical Debt               |`5`|
| ✔ | **C2** | Housekeeping Tests & CI      |`test/integration`| Code Quality                 |`1`|

**Proposed Sequence | C2 ➜ A1 ➜ A2 ➜ A3 ➜ C1 ➜ B1**

<!--
✔ = Complete
× = Incomplete
● = In Progress
○ = Pending
-->

abbr.\
- **CI = Continuous Integration** \
- **QA = Quality Assurance**

### Task Trace

This is the last task-group of core code work that, before a stable **v1.0.0-rc1** release, was intentionally left non-linear.  Some of that line of reasoning stems from the value I see in being able to move large chunks of work around to combat eventual fatigue.  It's also useful to link these tasks in a pivotable sequence so it's less a set of boxes to tick and more a map of the territory to traverse.

#### Task C2 | Housekeeping Tests & CI

These alphabetical A, B, C groups are only ordered by my fun-factor at the time of putting these tasks together.  But because I knew the validator was going to require at least two levels of testing, and deeper integration into workflows, I reordered these tasks, starting with **C2**--stabilizing the test harness and core modules. 

**Test Reorganization**\
The test suite was restructured by consolidating all module and subsystem integration tests into a new [`test/integration/`](../test/integration/) directory, and the Mocha configuration [`.mocharc.js`](../.mocharc.js) was updated to reflect this cleaner, more conventional layout.

``` bash
npm test -- --group level2
npm test -- --group rank[1-2]
npm test -- 'test/integration/**/*.test.1.?.1.js'
```

**Scriptable QA System**\
Once I had most of the tests organized into different penetration levels, for different modules, value-prop priority, their management of concurrent documents began to be its own beastly complexity (audit log, checklists, test scenarios to remember ranks, the `.mocharc` evolution, the source code to find `it.skip`). *How do I keep track of tests not auto'd by Mocha?*

A major overhaul of the quality assurance process was executed. Static markdown checklists were replaced with a scriptable system, featuring new scripts to parse structured audit logs and checklists to generate a dynamic QA Dashboard. This provides a verifiable, "single source of truth" for test coverage.

[`test/scripts/qa-dashboard.js`](../test/scripts/qa-dashboard.js)
``` bash
node test/scripts/qa-dashboard.js
```

See [`test/README.md`](../test/README.md) for a static snapshot of this dashboard.

Reducing the dashboard from a wall of troubles to a handful of justified skips and open features was more than a metric--it was a narrative of progress; a visible sign of intention and implementation.

**CI Implementation**\
A GitHub Actions workflow was introduced to automate the testing process. An initial bug related to git branch handling in bare repositories within the CI environment was promptly identified and fixed to ensure stable automated runs.

[**Github Actions**](https://github.com/brege/md-to-pdf/actions) -- Managed by [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

#### Task A1, A2, A3 | Plugin System Hardening

The reason I didn't dive into closing the test coverage first was in-part the uncertainty in *if* the validation logic was going to upend any UI, and also the fear of putting it off too long wouldn't afford it enough time to mature.

Therefore, **A1, A2, A3**, hardening the plugin system, would *force* standardized archetyping. This is something I think is unique about this plugin system, so we better make sure it at least feels has some modicum of completeness. This meant finalizing the v1 plugin contract, ensuring archetyping was sound, and integrating validation into the enablement workflow.

* **A1 | Finalize v1 Plugin Contract** \
  Task **A1** was addressed by standardizing the plugin directory structure and centralizing essential metadata. A `.contract/` subdirectory was introduced to house machine-readable validation assets, and each plugin's `.config.yaml` was established as the single source of truth for its name, version, and protocol.

* **A2 | Implement Fully Valid Archetyping** \
  To complete Task **A2**, the `plugin create --from <source>` command was significantly improved to ensure that newly archetyped plugins are immediately v1-compliant and pass their own E2E tests "out-of-the-box". This involved making the in-situ E2E tests (and schemas) within the plugin templates portable so they function correctly in their new, archetyped location.

* **A3 | Integrate Validator into Enablement** \
  Task **A3** was implemented by integrating the plugin validator directly into the `plugin enable` and `plugin add` commands. To support a phased rollout and avoid breaking workflows for legacy plugins, a critical `--bypass-validation` flag was also introduced, allowing users to explicitly skip the validation step.

#### Task C1 | Shrinking Gaps in Test Coverage -- QA + CI

The final and most substantial phase of this period was dedicated to Task **C1**. This involved a multi-pronged effort to fix existing integration tests and implement a new suite of high-level E2E tests to validate a pivotal architectural refactor.

**Resolving L1/L2 Integration Test Failures**\
A systematic effort was made to fix long-standing test failures and close coverage gaps in the Level 1 and 2 integration tests. 

This included:

* Refactoring `plugin_determiner` tests to use a manifest-driven approach.
* Adding module tests for `math_integration`
* Fixing persistent failures in the `main_config_loader` and `ConfigResolver` tests.
* Resolved a long-standing bug in the `default_handler` shortcode removal test.

These tests required deep console-logging in several layers of application code.

**Core Refactoring and L4 E2E Validation**\
Surprisingly, in the build-out of *lifecycle*--**L4**--E2E tests,
a large part of the C1 effort involved the discovery of new intelligence that
the  previously implemented `collRoot` did not behave as expected.

This was a pivotal refactor requiring deep architectural change.  This refactor involved:

1. Centralizing and universalizing how the collections root directory `collRoot` is handled throughout the application.

2. To validate this change, new lifecycle tests were implemented. These tests programmatically drive the CLI to simulate real user workflows and other potential, "*sad path*" failure conditions.

3. Because of this refactor, some older integration tests had to be updated to adhere to the new `collRoot` logic.

This **point 3.** deserves some extra care in explaination here. A key design component of this refactor was the formal separation of **context** from **configuration**.

The **`collRoot`** acts as an **exclusive context switch**. When a specific collections root is chosen (via the `--coll-root` flag, an environment variable, or a `collections_root` key), the application operates *exclusively* within that "universe" of plugins for the command's duration. It provides a powerful, predictable way to switch between entire sets of plugins for different projects.

**Plugin configuration**, in contrast, remains an **inclusive, merging hierarchy**. Within the selected `collRoot` context, the final settings for any given plugin are still built by layering project-specific overrides on top of user-global settings, which in turn are layered on top of the plugin's base defaults.

This separation not only aids in test isolationism, but ensures that users can have both a stable, switchable context for their plugin sources.

**In short..**
- `--coll-root` = exclusive context switch.
- `--plugin, --config` = inclusive, merging hierarchy.

---

**Task B1 has been moved to T5.**

---

## T5 | Zuckerwerk

This section's main focus is on finishing touches. Broadly, these tasks make the system more user-friendly, easier-to-use, and more inviting. This is the project's "**candy work**" phase.

#### T5.<!--ai-->ai -- LLM-Assisted Plugin Scaffolding

**Already done: `template-basic` and Plugin Contract.**

1. **ai.1 | An "Interaction Specification"**\
   This is the key missing piece. As outlined in the dream board, we need to create a new document that details the internal mechanics, file relationships, and APIs of the plugin system in a way that is optimized for a machine, not a human. It would be more direct and less narrative than the `plugin-development.md` guide.

2. **ai.2 | An Example Prompting Guide**\
   This document would provide concrete examples of how a user could prompt an AI to build a plugin for this system, including the necessary context and desired output. The "simple pendulum" or "wedding invitation" examples you mentioned in the dream board would be perfect for this.

#### T5.cli -- Tab Completion, `--help`

1. **B1 | Tab Completion**\
   This is the final unchecked item on the v0.9 checklist and a significant user experience improvement for the CLI. Yargs has built-in support that we can leverage to enable this.

2. **B2 | Standardize `--help`**\
   Standardize the help output to have consistent formatting, including consistent spacing and indentation. This will make it easier for users to navigate the help text and understand the structure of the command tree.

#### T5.e2e -- C3 | E2E Testing Final Pass

**Finish Deferred Tests** and: are more lifecycle tests needed? 
    
* **`--watch` mode tests [Level 4]:** Implement the final two E2E tests (`4.2.1` and `4.2.2`) to verify that file changes correctly trigger re-conversions.
* **`math_integration` test [Level 1]:** Address the last skipped test (`1.7.4`) related to gracefully handling a `require` failure for the KaTeX package.

#### T5.doc -- Documentation Polish

1. **D1 | Documentation Index & Journals**

   Four Pillars of Documentation: **Reference**, **Tutorial**, **Explanation**, and **How-to's**
   * Organize and index all architectural, historical, and process documents.
   * Produce a Node.js script that is configurable and can be used to generate a list and index of all documentation.

2. **D2 | Final Documentation Review**
   
    Four C's of Documentation: **Clarity**, **Consistency**, **Completeness**, and **Conciseness**

   * Perform a final review of the main `README.md`, `cheat-sheet.md`, and `plugin-development.md` to ensure they are all consistent and reflect the final state of the v0.9 series.


### T5 | Task Matrix

This table outlines the assets and tasks required to enable an AI to reliably generate new plugins for 
`md-to-pdf`, make the CLI more ergonomic and intuitive, and tie-up any remaining loose ends in testing and documentation.

| ✔ | **ID** | Asset                            | Description  |`#`|
|:-:|:------:|:---------------------------------|:-------------|:-:|
|   |        | <span style="white-space:nowrap">**T5<!--ai-->.ai -- LLM Plugin Scaffolding**</span> | | |
| ✔ | **A2** | *`template-basic` Archetyping*   | Primary *technical* asset. Builds on the `plugin create` command.  |`.`|
| ✔ | **A1** | *Plugin Contract*                | Primary *human-readable* asset. `docs/plugin-contract.md` provides formal rules for generated plugin [context for the AI]  |`.`|
| ○ | **ai.1**| *Interaction Specification*     | Details the internal mechanics, file relationships, and APIs of the plugin system--optimized for machines.  |  |  
| ○ | **ai.2**| *Example Prompting Guide*       | Concrete examples of how to *frame* an AI, examples like a "simple pendulum" physics handout or "wedding invitation" prompt.  |  |
|   |        | <span style="white-space:nowrap">**T5.cli -- CLI Polish**</span> | | |
| ○ | **B1** | *Tab Completion*                 | A significant user-experience improvement to aid discoverability and usage of the CLI. Can be enabled via Yargs' built-in support.  |  |  
| ○ | **B2** | *Standardize `--help`*           | A final pass to standardize the formatting, spacing, and indentation of all `--help` text to improve readability and consistency.  |  |
|   |        | <span style="white-space:nowrap">**T5.e2e -- Deferred Tests**</span> | | |
| ○ | **C3** | *Deferred Test Completion*       | Implement the final pending tests and decide if more lifecycle tests are needed. |  |
|   |        | <span style="white-space:nowrap">**T5.doc -- Documentation Polish**</span> | | | 
| ✔ | **D1** | *Documentation Index & Journals* | Organize and index all architectural, historical, and process docs. |`1`| 
| ○ | **D2** | *Final Documentation Review*     | Perform a final consistency and accuracy review of main user-facing docs. |  |


**Legend**
| | | | | |
|:-----:|:------------------------|-|:-:|:-----------|
| `ai`  | Artificial Intelligence | | ✔ | Completed  |
| `cli` | Command Line Interface  | | × | Incomplete |
| `e2e` | End-to-End              | | ● | Active     |
| `doc` | Documentation           | | ○ | Inactive   |

### T5 | Timeline

#### A2 + A1 | Archetyping & Plugin Contract

The core plugin system hardening tasks (A1: Plugin Contract, A2: Archetyping) 
were completed in the previous push before **T5**.
Their mention is simply ceremonial, as these two specific tasks **seed** the work in **ai.1** and **ai.2**.

#### D1 | Documentation Index & Journals

The project had accumulated a significant number of valuable but disparate documents, including changelogs, design notes, and user guides. To improve discoverability and provide a clear entry point for users and contributors, a documentation index was established.

The process was as follows:
1. A new master landing page has been introduced at [`docs/index.md`](index.md).
2. This index was structured using the **Diátaxis framework** to categorize all existing documentation into four distinct pillars: Tutorials, Reference, Explanation, and How-To Guides.

3. To ensure the index remains comprehensive over time, a new Node.js script was developed at 
  [`scripts/index-docs.js`](../scripts/index-docs.js). 
   ``` bash
   node scripts/index-docs.js  # [update]
   ```
   This configurable tool programmatically finds all `*.md` files and automatically updates
   [`index.md`](index.md)   with their entries.
   This facilitated honing *which* `*.md` were important for records
   (e.g., ignore [`plugins/`](../plugins) but keep [`plugins/README.md`](../plugins/README.md)),
   gradually reducing the number of actual documentation files.

4. The script allowed me to reconcile the untracked architectural "lucidity" journals 
   I had written along the way, during pivotal hours of this project's history.
   These journals have now been formally added to the repository at [**`docs/lucidity`**](./lucidity).


