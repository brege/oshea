# Dream Board v0.8: Unified Plugin + Collection Management

## Core Philosophy

`md-to-pdf` aims to provide a unified command-line interface to manage both plugin *sources* (collections) and individual *plugins*. The `~/.local/share/md-to-pdf/collections/` directory (`COLL_ROOT`) serves as the primary managed area for plugin collections and standalone plugins that `md-to-pdf` uses.

The goal for the v0.8.x series is to enable users to perform all common plugin management tasks (adding collections, adding single plugins, enabling, disabling, updating, creating new plugins from templates or existing ones) directly via the `md-to-pdf` CLI, minimizing the need for manual configuration file editing for plugins managed within `COLL_ROOT`. 

The `enabled.yaml` manifest within `COLL_ROOT` will be the primary machine-managed registry for these plugins. Manual registration in global or project `config.yaml` files will remain a powerful option for advanced use cases or plugins stored outside `COLL_ROOT`.

While at the onset of the v0.8 series doesn't currently support updates from local sandboxes *not* managed by Git, there is some sense of applying an analogue version of git pull to these local sandboxes via rsync--or rather, some node tool isomorphic to rsync for our intend task of pseudo-cloning. The separation of

  1. editing a piece of code for a plugin in one locations, then

  2. running `md-to-pdf collection update` -aka- `md-to-pdf-cm update`

provides a natural development workflow.

## Proposed Unified CLI Structure (Target for v0.8.x)

### I. Core Conversion & Info Commands - Existing `md-to-pdf` base

* `md-to-pdf <markdownFile> [options]`
* `md-to-pdf convert <markdownFile> [--plugin <nameOrPath>] [options]`
* `md-to-pdf generate <pluginName> [plugin-specific-options...] [options]`
* `md-to-pdf config [--plugin <pluginName>] [--pure]`
* `md-to-pdf help` (General CLI help)

### II. Plugin Management - `md-to-pdf plugin ...`

*Focuses on individual plugins and their lifecycle for use by the converter.*

#### 1.  Creation of new plugins

  ```
  md-to-pdf plugin create <new-plugin-name> [--from <collection_name/source_plugin_id | /path/to/source_plugin_dir>] [--target-dir <path>] [--force]
  ```

  * If `--from` is used, it archetypes from a specified existing plugin (either a managed one via `collection_name/plugin_id` or an unmanaged one via direct path).

  * If `--from` is *not* used, it archetypes from a bundled default template plugin.

  * `--target-dir` defaults: `./<new-plugin-name>` if creating from template (no `--from`); `../my-plugins/<new-plugin-name>` (relative to `COLL_ROOT`) if archetyping via `--from`.

#### 2.  Activation/Deactivation of plugins (managed within `COLL_ROOT`)

  ```
  md-to-pdf plugin enable <collection_name/plugin_id | collection_name --all> [--name <invoke_name>] [--prefix <prefix_string>] [--no-prefix]
  ```
  Activates plugin(s) from a collection already in `COLL_ROOT`.

  ```
  md-to-pdf plugin disable <invoke_name>
  ```
  Deactivates a plugin.

#### 3.  Adding a standalone plugin to `COLL_ROOT` management

  ```
  md-to-pdf plugin add <path_to_plugin_dir> [--name <invoke_name>]
  ```
  Copies a single plugin directory into a special managed area within `COLL_ROOT` (e.g., `COLL_ROOT/_singletons/`) and enables it with the given or derived `invoke_name`.

#### 4.  Listing plugins

  ```
  md-to-pdf plugin list [--available | --enabled | --disabled] [<collection_name_filter>]
  ```

  * `--available` \
    Lists plugins within `COLL_ROOT` collection(s) that *can be* enabled. Output should clearly show the `collection_name/plugin_id` needed for `plugin enable`.
  * `--enabled` \
    Lists plugins currently active from `enabled.yaml`. Output should clearly show the `invoke_name` needed for `plugin disable` or `md-to-pdf convert --plugin`.
  * `--disabled` \ 
    Lists available plugins in `COLL_ROOT` that are not currently enabled.

*Default* (no status flag): 
Provides a comprehensive view of all plugins usable by `md-to-pdf` (from traditional `config.yaml` registrations AND CM-enabled plugins from `enabled.yaml`), indicating their source/status.

#### 5.  Showing help for a plugin
  
  ```
  md-to-pdf plugin help <invoke_name>   # for enabled or traditionally registered plugins
  ```

### III. Collection Management - `md-to-pdf collection ...`

*Focuses on managing the plugin "collections" (directories containing multiple plugins) that are stored and managed within `COLL_ROOT`.*

#### 1. Adding a new collection of plugins (to `COLL_ROOT`):
    
  ```
  md-to-pdf collection add <url_or_local_path_to_source> [--name <collection_name_in_coll_root>]
  ```
  Copies/clones a plugin collection *into* `COLL_ROOT`.

#### 2. Removing a collection from `COLL_ROOT`:
  
  ```
  md-to-pdf collection remove <collection_name_in_coll_root> [--force]
  ```
  `--force` also disables any plugins from this collection in `enabled.yaml`.

#### 3. Updating a collection in `COLL_ROOT`:
  
  ```
  md-to-pdf collection update [<collection_name_in_coll_root>]
  ```
  - If Git-sourced, performs `git fetch` & `reset`.
  - If locally-sourced (added via a local path), re-syncs/copies from that original local source path.

#### 4. Listing names of collections managed within `COLL_ROOT`:
  
  ```
  md-to-pdf collection list
  ```

---

This structure clarifies that `md-to-pdf collection add` and `md-to-pdf plugin add` are the explicit steps to bring any set of plugins (collections or singletons from various sources) into the managed `COLL_ROOT` environment. Then, `md-to-pdf plugin enable` acts upon these known, managed collections/plugins.

## Integration & Refinement Plan for v0.8.x

### Phase 1 [[v0.8.3][v0.8.3]]: Foundation & Initial Command Migration 

##### [Status: Completed (v0.8.3)][v0.8.3]

 *This phase begins the merging of the Collection Manager module into the main CLI of `md-to-pdf`.*

#### 1. Integrate `CollectionsManager` Core

  **Status:** Complete. \
  Integration of `CollectionsManager` class made available to `md-to-pdf/cli.js`.

#### 2. Implement `md-to-pdf collection` Subcommands

  **Status:** Complete. \
  Ported from `md-to-pdf-cm`
  - `add` - **Status:** Ported from `md-to-pdf-cm`
  - `list` - **Status:** Ported from `md-to-pdf-cm` (for collection names)
  - `remove` - **Status:** Ported from `md-to-pdf-cm` 
  - `update` - **Status:** Not tested [**TODO**]: ported from `md-to-pdf-cm`

#### 3. Implement `md-to-pdf plugin enable/disable`

  **Status:** Complete. \
  Ported from `md-to-pdf-cm`

#### 4. Testing
  
  **Status:** Complete -- for the most part. \
  Hybrid test strategy implemented in `/test/cm-tests/` for direct module tests. \
  See [Testing](#add-select-cli-based-integration-tests) section below.

### Phase 2: Unify Core Plugin Workflow & CLI Usability 

*This phase aims to make the CLI the primary and intuitive interface for all common plugin management tasks, minimizing the need for manual configuration file editing for plugins managed within `COLL_ROOT`.*

#### Rationale for Unification

  Addresses current potential for user confusion arising from:

  * Multiple `list` commands (`collection list`, `plugin list`, old `md-to-pdf-cm list`) with different outputs and scopes.
  * Inconsistent or unclear identifiers used for plugins across different commands (`invoke_name` vs. `collection_name/plugin_id`).
  * Cumbersome process for adding and enabling standalone (singleton) plugins.


#### 5. [[v0.8.4][v0.8.4]] Unify `md-to-pdf plugin list`

##### [Status: Completed (v0.8.4)][v0.8.4]
  
  * **Goal:** Make `md-to-pdf plugin list` the central command for querying all plugin states.

  * **Enhancements**

    Add flags \
    `--available`, `--enabled`, `--disabled` and `[<collection_name_filter>]` 

    The output will be designed to clearly guide users on which identifiers (`invoke_name` or `collection_name/plugin_id`) to use for subsequent commands.

  * **Results:**

    - Unified backend data fetching via `PluginRegistryBuilder`
      
      - aware of `CollectionsManager`
      
    - **`md-to-pdf plugin list`** - **Status:** Completed
      
      - `--available`
      - `--enabled`
      - `--disabled` = {`--available`} - {`--enabled`}
      - `--short`: for a condensed, one-line summary output.

    - **`md-to-pdf collection list`** - **Status:** Completed

      - Output now includes collection source (Git/local path) and added/updated dates.
      - Optional `[<collection_name_filter>]` for CM-managed plugins.
      
    - Refined console output with improved formatting and consistent coloring.


#### 6. [[v0.8.5][v0.8.5]] Unify `md-to-pdf plugin create` with Archetype Functionality

  * **Goal:** \
  Make `md-to-pdf plugin create` the single command for generating new plugins, whether from a template or an existing plugin.

  * **Enhancements:**
    - Archetype from a predefined bundled "template" plugin, likely 'default', without `--from`:
      ```
      plugin create <new-plugin-name>`
      ```
      This is using the existing `CollectionsManager.archetypePlugin` logic. \
    - Using `--from` with an existing plugin:
      ```
      plugin create <new-plugin-name> --from <source_identifier>
      ```
      This will use `CollectionsManager.archetypePlugin` to copy and adapt the specified existing plugin.
        * `<source_identifier>` can be `collection_name/plugin_id` or a direct path
        * Reconcile `--target-dir` default behaviors based on whether `--from` is used.
  
    * The original `src/plugin_scaffolder.js` logic will be superseded.
    * **Deprecate:** The command `md-to-pdf collection archetype` will be deprecated, or aliased.


  * **Results (v0.8.5)**

    - `md-to-pdf plugin create <name>`
      - now uses `CollectionsManager.archetypePlugin` as its engine.

    - **If no `--from`** \
      then it creates a plugin from a new bundled template `plugins/template-basic/`. This template includes a self-activating example Markdown file. Default output is to current working directory `./<new-plugin-name>`.

    - **If `--from <source_identifier>`** \
      then it archetypes from the specified source (CM-managed plugin ID or direct filesystem path). Default output is to the CM archetype directory (e.g., `my-plugins/`).
    
    - `CollectionsManager.archetypePlugin` \
      * handle direct path sources
      * better file/content renaming and metadata handling.
    
    - The `isValidPluginName` utility has been:
      * moved to `cm-utils.js` , and
      * integrated into `plugin create`.
    
  
  * **Deprecation/Removal**
    
    - The original `src/plugin_scaffolder.js` logic is now superseded.
    
    - The `md-to-pdf collection archetype` command is now deprecated. 
      * A command stub issues a warning and delegates to the new `plugin create --from` functionality for this version.
    
  * **New Features**

    - Self-activating example Markdown files `<plugin-name>-example.md` were added to the bundled plugins:
      
       | **Templates** | **Example Markdown Files**                                   |
       |---------------|--------------------------------------------------------------|
       |`default`      | `plugins/default/default-example.md`                         | 
       |`cv`           | `plugins/cv/cv-example.md`                                   |
       |`cover-letter` | `plugins/cover-letter/cover-letter-example.md`               |
       |`recipe`       | `plugins/recipe/recipe-example.md`                           |


#### 7.  [[v0.8.6][v0.8.6]] Enhance Local Plugin/Collection Management

  * **Goal:** Improve the workflow for managing and updating locally developed or sourced plugins and collections.

  * **Warmup:** 

    Add a condensed view for listing downloaded collections:
    ```
    md-to-pdf collection list --short
    ```
    
  * **Enhancements:**
    - Implement re-sync capability for locally-sourced collections: 
      ```
      md-to-pdf collection update [<collection_name>]`
      ```
      This involves re-copying from the original local source path recorded in the collection's metadata.
    - Implement command to add a single local plugin directory to `COLL_ROOT` management:
      ```
      md-to-pdf plugin add <path_to_plugin_dir> [--name <invoke_name>]
      ```
      **Caution:** Carefully think out what `md-to-pdf collection remove <singleton_name>` should do.
    - Copying the plugin to a structured location within `COLL_ROOT` (e.g., `COLL_ROOT/_user_plugins/<plugin_name>/` or similar that denotes its singleton nature but allows metadata).
    - Creating a `.collection-metadata.yaml` for it, recording its original local path as the `source`?
    - Automatically enabling the plugin, by using, for example:
      * `plugin_name` as `invoke_name`, or
      * as specified by `--name`.
    - This plugin would then be updatable via the enhanced `collection update` command.

### Phase 3: Deprecation and Documentation Overhaul 

#### 8. [[v0.8.7][v0.8.7]] Deprecate `md-to-pdf-cm` (Standalone Tool)

  Once all essential functionalities are robustly integrated into `md-to-pdf`, the standalone `md-to-pdf-cm` entry point will be officially deprecated
  
  1. CLI script will issue a warning and redirect users. 
  2. Eventual removal in v0.9+.

#### 9.  **Comprehensive Documentation Overhaul**

Update all user-facing documentation:

  - `README.md`
  - `docs/plugin-development.md`
  - `docs/cheat-sheet.md`
  - `src/collections-manager/walkthrough.md` 

to reflect the unified `md-to-pdf` CLI. 

#### 10.  **Add Select CLI-Based Integration Tests**

Implement the deferred "rigorous check" tests for the core CLI workflows of the integrated collection and plugin management commands.

* **v0.8.5 - Unified Plugin Generation** \
  Consolidate plugin creation by enhancing `md-to-pdf plugin create` to handle both scaffolding from a template and archetyping from an existing source (using `--from`), deprecating the separate `collection archetype` command.

* **v0.8.6 -  Local Source Management - Part 1** \
  Implement re-sync capability in `md-to-pdf collection update` for collections originally added from local, non-Git paths, allowing them to be refreshed from their source.

* **v0.8.6 - Local Source Management - Part 2** \
  Introduce `md-to-pdf plugin add <path_to_plugin_dir>` to copy, manage (with metadata for updates), and auto-enable single local plugins within `COLL_ROOT`. (The `md-to-pdf collection list --short` flag can also be addressed in this phase).

Like the documentation overhaul, it is best to wait until the `stdout` has stabilized before implementing these tests. While there is a substantial set of **direct module tests**, these **CLI-based integration tests** (the kind performed in the 'main' test suite, provide a more thorough, penetrative check of full-stack integrity.  The analogy in mathematics is, respectively, the difference between formal and rigorous proofs.

### Considerations during implementation

* **Error Handling and User Feedback** \
  Ensure consistent and clear messages across all unified commands.

* **Testing** \
  The hybrid testing strategy will continue. New CLI-level integration tests will be added for the unified commands.

* **`PluginRegistryBuilder`** \
  Will primarily rely on `enabled.yaml` for CM-managed plugins. The enhanced `md-to-pdf plugin list` default mode will continue to merge this with traditionally registered plugins.

* **Manual Configuration** \
  Manual registration in `config.yaml` files remains the ultimate override mechanism and is suitable for plugins not managed within `COLL_ROOT` or for advanced/scripted setups.

[v0.8.3]: https://github.com/brege/md-to-pdf/releases/tag/v0.8.3
[v0.8.4]: https://github.com/brege/md-to-pdf/releases/tag/v0.8.4
[v0.8.5]: https://github.com/brege/md-to-pdf/releases/tag/v0.8.5
[v0.8.6]: https://github.com/brege/md-to-pdf/releases/tag/v0.8.6
[v0.8.7]: https://github.com/brege/md-to-pdf/releases/tag/v0.8.7
