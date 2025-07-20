## Test Generation Priority Order

This document outlines the priority and status for the implementation of the project's automated tests. It serves as a high-level map of the testing strategy.

The testing framework is divided into **Levels** and **Ranks**.

**Level** refers to the type and scope of a test suite.\
It can be thought of as categorizing the tests in terms of their fidelity, how faithfully the test reproduces the conditions of the production environment and a real user's interaction.
  * **L0** -- Level 0. Core utility unit tests.[^1]
  * **L1** -- Level 1. Module Integration tests, verifying the interactions between closely related functions within a single module.
  * **L2** -- Level 2. Subsystem Integration tests, verifying the interactions between different modules that form a cohesive subsystem.
  * **L3** -- Level 3. E2E (End-to-End) tests, verifying CLI commands and their primary options.
  * **L4** -- Level 4. Advanced E2E tests, verifying complex workflows and edge cases.

**Rank** refers to the implementation priority, based on how foundational the module is to the application's core value proposition. Rank 0 is the highest priority.

### Module Test Counts by Level

| Level | Tests      | Rank       | Module                    |
| :---- | :--------- | :--------- | :------------------------ |
| L1Y1  |  15 Tests  |  Rank 1    | `ConfigResolver`          |
| L1Y2  |  32 Tests  |  Rank 2    | `PluginRegistryBuilder`   |
| L1Y3  |  14 Tests  |  Rank 1    | `plugin_determiner`       |
| L1Y4  |  19 Tests  |  Rank 2    | `main_config_loader`      |
| L1Y5  |   9 Tests  |  Rank 2    | `PluginManager`           |
| L1Y6  |  15 Tests  |  Rank 2    | `plugin_config_loader`    |
| L1Y7  |   8 Tests  |  Rank 2    | `math_integration`        |
| L1Y8  |   3 Tests  |  Rank 2    | `cm-utils`                |
| L2Y1  |  28 Tests  |  Rank 1    | `collections-manager`     |
| L2Y2  |  16 Tests  |  Rank 0    | `default_handler`         |
| L2Y3  |  10 Tests  |  Rank 0    | `pdf_generator`           |
| L2Y4  |  10 Tests  |  Rank 1    | `plugin-validator`        |
| L3    |  34 Tests  |  N/A       | E2E CLI Commands          |
| L4    |   5 Tests  |  N/A       | Advanced E2E Workflows    |

*L0 tests (nitpick logic) are not performed.*  

**Higher level** numbers mean the tests are measuring more of the system as a whole,
while **lower level** numbers mean the tests target more internal logical structures.*

### Prioritized Order for Test Generation--by Rank

This order was designed to focus on a set of related modules before shifting context, while still tackling the most foundational areas first.

**Rank 0 -- Mission Critical Core Operations (Total: 26 Tests)** \
These modules represent the absolute core processing pipeline and the final output generation. Their functionality is directly observable by the user.

1. **L2Y2: `default_handler`**
   -- [`src/core/default-handler.js`](../../src/core/default-handler.js)
   -- 16 Tests
2. **L2Y3: `pdf_generator`**
   -- [`src/core/pdf-generator.js`](../../src/core/pdf-generator.js)
   -- 10 Tests

---

**Rank 1 -- Essential Subsystem / Core Configuration (Total: 67 Tests)** \
These modules handle fundamental configuration loading, plugin selection, and the management of the collections ecosystem. They are foundational, and issues here can have widespread, hard-to-trace impacts.

1. **L1Y1: `ConfigResolver`** 
   -- [`src/config/config-resolver.js`](../../src/config/config-resolver.js) 
   -- 15 Tests
2. **L1Y3: `plugin_determiner`** 
   -- [`src/plugins/plugin-determiner.js`](../../src/plugins/plugin-determiner.js)
   -- 14 Tests
3. **L2Y1: `collections-manager`**
   -- [`src/collections/index.js`](../../src/collections/index.js)
   -- 28 Tests
4. **L2Y4: `plugin-validator`**
   -- [`src/plugins/plugin-validator.js`](../../src/plugins/validator.js)
   -- 10 Tests

---

**Rank 2 -- Supportive Core Functionality / Key Integrations (Total: 82 Tests)** \
These modules provide essential services, manage key data structures, and integrate specific features.

1. **L1Y2: `PluginRegistryBuilder`**
   -- [`src/plugins/plugin-registry-builder.js`](../../src/plugins/plugin-registry-builder.js)
   -- 32 Tests
2. **L1Y4: `main_config_loader`**
   -- [`src/config/main-config-loader.js`](../../src/config/main-config-loader.js)
   -- 19 Tests
3. **L1Y6: `plugin_config_loader`**
   -- [`src/config/plugin-config-loader.js`](../../src/config/plugin-config-loader.js)
   -- 15 Tests
4. **L1Y5: `PluginManager`**
   -- [`src/plugins/plugin-manager.js`](../../src/plugins/plugin-manager.js)
   -- 9 Tests
5. **L1Y7: `math_integration`**
   -- [`src/core/math-integration.js`](../../src/core/math-integration.js)
   -- 8 Tests
6. **L1Y8: `cm-utils`**
   -- [`src/collections/cm-utils.js`](../../src/collections/cm-utils.js)
   -- 3 Tests

---

### Summary Table - Ordered by Priority

**Rank 0 > Rank 1 > Rank 2**

| Level | Tests      | Rank       | Module                    | Coverage  | Remaining |
| :---- | :--------- | :--------- | :------------------------ | :-------- | :-------- |
| L2Y2  |  16 Tests  |  Rank 0    | `default_handler`         | 15/16     | **1/16** |
| L2Y3  |  10 Tests  |  Rank 0    | `pdf_generator`           | 9/10      | **1/10** |
|       |            |            |                           |           |
| L1Y1  |  15 Tests  |  Rank 1    | `ConfigResolver`          | 14/15     | **1/15** |
| L1Y3  |  14 Tests  |  Rank 1    | `plugin_determiner`       | 13/14     | **1/14** |
| L2Y1  |  28 Tests  |  Rank 1    | `collections-manager`     | 28/28     | **DONE** |
| L2Y4  |  10 Tests  |  Rank 1    | `plugin-validator`        | 10/10     | **DONE** |
|       |            |            |                           |           |
| L1Y2  |  32 Tests  |  Rank 2    | `PluginRegistryBuilder`   | 23/32     | **9/32** |
| L1Y4  |  19 Tests  |  Rank 2    | `main_config_loader`      | 17/19     | **2/19** |
| L1Y5  |   9 Tests  |  Rank 2    | `PluginManager`           | 9/9       | **DONE** |
| L1Y6  |  15 Tests  |  Rank 2    | `plugin_config_loader`    | 14/15     | **1/15** |
| L1Y7  |   8 Tests  |  Rank 2    | `math_integration`        | 0/8       | **8/8** |
| L1Y8  |   3 Tests  |  Rank 2    | `cm-utils`                | 3/3       | **DONE** |

---

### Ongoing Test Status Tracking

As of commit [`ff43eb5`](https://github.com/brege/md-to-pdf/commit/ff43eb5), this document provides a static, high-level overview of the test suite's structure and initial implementation priorities.

For a live, dynamic view of all currently pending, skipped, or failing tests, the authoritative source is the QA Dashboard. It can be generated by running `node test/scripts/qa-dashboard.js` and viewing the output in [`test/index.md`](../index.md).

---
[^1]: Level 0 tests, which would target individual, isolated functions (traditional unit tests), were not pursued for this project. The testing strategy prioritized integration and end-to-end scenarios to verify the interoperability of the system's components.
