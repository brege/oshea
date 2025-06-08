- test-scenario-checklist-Level\_1.md
- test-scenario-checklist-Level\_2.md


| Level | Tests      | Rank       | Module                    |
| :---- | :--------- | :--------- | :------------------------ |
| L1Y1  |  15 Tests  |  Rank 1    | `ConfigResolver`          |
| L1Y2  |  32 Tests  |  Rank 2    | `PluginRegistryBuilder`   |
| L1Y3  |  14 Tests  |  Rank 1    | `plugin_determiner`       |
| L1Y4  |  19 Tests  |  Rank 2    | `main_config_loader`      |
| L1Y5  |   9 Tests  |  Rank 2    | `PluginManager`           |
| L1Y6  |  15 Tests  |  Rank 2    | `plugin_config_loader`    |
| L1Y7  |   8 Tests  |  Rank 2    | `math_integration`        |
| L1Y8  |   9 Tests  |  Rank 2    | `cm-utils`                |
| L2Y1  |  28 Tests  |  Rank 1    | `collections-manager`     |
| L2Y2  |  16 Tests  |  Rank 0    | `default_handler`         |
| L2Y3  |  10 Tests  |  Rank 0    | `pdf_generator`           |

Rank 0: 10 + 16      = 26
Rank 1: 15 + 14 + 28 = 57
Rank 2:              = 93

### Prioritized Order for Test Generation (by Collective Rank)

This order is designed to allow you to focus on a set of related modules before shifting your context, while still tackling the most critical areas first.

**Rank 0: Mission Critical Core Operations (Total: 26 Tests)**
These modules represent the absolute core processing pipeline and the final output generation. Their functionality is directly observable by the user.

1.  **L2Y2: `default_handler`** (`src/default_handler.js`) - 16 Tests
  * *Rationale:* This module embodies the entire Markdown processing pipeline, transforming raw content into the final HTML that `pdf_generator` consumes. Its robust functionality is paramount to the application's core purpose.
2.  **L2Y3: `pdf_generator`** (`src/pdf_generator.js`) - 10 Tests
  * *Rationale:* Directly responsible for the final PDF output. Any failure here means the application fails to deliver its primary value proposition.

---

**Rank 1: Essential Subsystem / Core Configuration (Total: 57 Tests)**
These modules handle fundamental configuration loading, plugin selection, and the management of the collections ecosystem. They are foundational, and issues here can have widespread, hard-to-trace impacts.

1.  **L1Y1: `ConfigResolver`** (`src/ConfigResolver.js`) - 15 Tests
  * *Rationale:* Central to how all configurations (main and plugin-specific) are loaded, merged, and resolved. It's the "brain" for configuration.
2.  **L1Y3: `plugin_determiner`** (`src/plugin_determiner.js`) - 14 Tests
  * *Rationale:* Crucial for selecting the *correct* plugin based on various precedence rules (CLI, Front Matter, Local Config). If this fails, the wrong plugin, or no plugin, is used.
3.  **L2Y1: `collections-manager`** (`src/collections-manager/index.js`) - 28 Tests
  * *Rationale:* The core of the collections system, handling adding, removing, updating, enabling, and disabling plugins/collections. It involves complex file system and manifest interactions.

---

**Rank 2: Supportive Core Functionality / Key Integrations (Total: 92 Tests)**
These modules provide essential services, manage critical data structures (like the plugin registry), and integrate specific features. While not "mission critical" in the same immediate sense as Rank 0, their robust operation is vital for the application's overall stability and feature set.

1.  **L1Y2: `PluginRegistryBuilder`** (`src/PluginRegistryBuilder.js`) - 32 Tests
  * *Rationale:* Directly impacts the discoverability and availability of plugins within the system. Failures here mean plugins can't be found or used correctly.
2.  **L1Y4: `main_config_loader`** (`src/main_config_loader.js`) - 19 Tests
  * *Rationale:* Responsible for loading the application's global configuration files (bundled, XDG, project). Fundamental to the application starting with the correct settings.
3.  **L1Y6: `plugin_config_loader`** (`src/plugin_config_loader.js`) - 15 Tests
  * *Rationale:* Manages the complex process of applying layered overrides (XDG, project) to individual plugin configurations. Essential for customized plugin behavior.
4.  **L1Y5: `PluginManager`** (`src/PluginManager.js`) - 9 Tests
  * *Rationale:* The direct interface for dynamically loading and invoking plugin handler scripts. Without this, even discovered and configured plugins cannot execute.
5.  **L1Y7: `math_integration`** (`src/math_integration.js`) - 8 Tests
  * *Rationale:* Integrates a specific but important feature (math rendering) with the Markdown processing pipeline.
6.  **L1Y8: `cm-utils`** (`src/collections-manager/cm-utils.js`) - 9 Tests
  * *Rationale:* Contains utility functions that support the collections manager. While essential, these are typically self-contained string transformations with lower integration complexity compared to the other modules in Rank 2. Their failure modes are usually contained and easily debugged.

---


### Summary Table - Order by Priority: Higher Rank = Lower Priority

| Level | Tests      | Rank       | Module                    | Coverage  | Remaining |
| :---- | :--------- | :--------- | :------------------------ | :-------- | :-------- |
| L2Y2  |  16 Tests  |  Rank 0    | `default_handler`         | 08/16     | **8/16**  |
| L2Y3  |  10 Tests  |  Rank 0    | `pdf_generator`           | 09/10\*   | **DONE**  |
|       |            |            |                           |           |
| L1Y1  |  15 Tests  |  Rank 1    | `ConfigResolver`          | 14/15     | **1/15**  |
| L1Y3  |  14 Tests  |  Rank 1    | `plugin_determiner`       | 13/14     | **1/14**  |
| L2Y1  |  28 Tests  |  Rank 1    | `collections-manager`     | 28/28     | **DONE**  |
|       |            |            |                           |           |
| L1Y2  |  32 Tests  |  Rank 2    | `PluginRegistryBuilder`   | 29/32     | **3/32**  |
| L1Y4  |  19 Tests  |  Rank 2    | `main_config_loader`      | xx/19     |     |
| L1Y5  |  9 Tests   |  Rank 2    | `PluginManager`           | xx/9      |     |
| L1Y6  |  15 Tests  |  Rank 2    | `plugin_config_loader`    | xx/15     |     |
| L1Y7  |  8 Tests   |  Rank 2    | `math_integration`        | xx/8      |     |
| L1Y8  |  9 Tests   |  Rank 2    | `cm-utils`                | xx/9      |     |

