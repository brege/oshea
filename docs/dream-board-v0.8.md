## Dream Board v0.8: Unified Plugin + Collection Management

### Core Philosophy

`md-to-pdf` aims to provide a unified command-line interface to manage both plugin *sources* (collections) and individual *plugins*. The `~/.local/share/md-to-pdf/collections/` directory (`COLL_ROOT`) serves as the primary managed area for plugin collections and standalone plugins that `md-to-pdf` uses.

The goal for the v0.8.x series is to enable users to perform all common plugin management tasks (adding collections, adding single plugins, enabling, disabling, updating, creating new plugins from templates or existing ones) directly via the `md-to-pdf` CLI, minimizing the need for manual configuration file editing for plugins managed within `COLL_ROOT`. The `enabled.yaml` manifest within `COLL_ROOT` will be the primary machine-managed registry for these plugins. Manual registration in global or project `config.yaml` files will remain a powerful option for advanced use cases or plugins stored outside `COLL_ROOT`.

While at the onset of the v0.8 series doesn't currently support updates from local sandboxes *not* managed by Git, there is some sense of applying an analogue version of git pull to these local sandboxes via rsync--or rather, some node tool isomorphic to rsync for our intend task of pseudo-cloning. The separation of

  1. Editing a piece of code for a plugin in one locations, then

  2. Then running `md-to-pdf collection update` (formerly `md-to-pdf-cm update`)

is a natural development workflow. (The current `collection update` for local paths re-copies from original source).*

### Proposed Unified CLI Structure (Target for v0.8.x)

#### I. Core Conversion & Info Commands - Existing `md-to-pdf` base

* `md-to-pdf <markdownFile> [options]`
* `md-to-pdf convert <markdownFile> [--plugin <nameOrPath>] [options]`
* `md-to-pdf generate <pluginName> [plugin-specific-options...] [options]`
* `md-to-pdf config [--plugin <pluginName>] [--pure]`
* `md-to-pdf help` (General CLI help)

#### II. Plugin Management - `md-to-pdf plugin ...`

*Focuses on individual plugins and their lifecycle for use by the converter.*

1.  **Creation of new plugins**

    ```
    md-to-pdf plugin create <new-plugin-name> [--from <collection_name/source_plugin_id | /path/to/source_plugin_dir>] [--target-dir <path>] [--force]
    ```

    * If `--from` is used, it archetypes from a specified existing plugin (either a managed one via `collection_name/plugin_id` or an unmanaged one via direct path).
    
    * If `--from` is *not* used, it archetypes from a bundled default template plugin.
    
    * `--target-dir` defaults: `./<new-plugin-name>` if creating from template (no `--from`); `../my-plugins/<new-plugin-name>` (relative to `COLL_ROOT`) if archetyping via `--from`.

2.  Activation/Deactivation of plugins (managed within `COLL_ROOT`)
    ```
    md-to-pdf plugin enable <collection_name/plugin_id | collection_name --all> [--name <invoke_name>] [--prefix <prefix_string>] [--no-prefix]
    ```
    Activates plugin(s) from a collection already in `COLL_ROOT`.
    
    ```
    md-to-pdf plugin disable <invoke_name>
    ```
    Deactivates a plugin.

3.  Adding a standalone plugin to `COLL_ROOT` management
    ```
    md-to-pdf plugin add <path_to_plugin_dir> [--name <invoke_name>]
    ```
    Copies a single plugin directory into a special managed area within `COLL_ROOT` (e.g., `COLL_ROOT/_singletons/`) and enables it with the given or derived `invoke_name`.

4.  Listing plugins
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

5.  Showing help for a plugin
    ```
    md-to-pdf plugin help <invoke_name>   # for enabled or traditionally registered plugins
    ```

#### III. Collection Management - `md-to-pdf collection ...`

*Focuses on managing the plugin "collections" (directories containing multiple plugins) that are stored and managed within `COLL_ROOT`.*

1.  Adding a new collection of plugins (to `COLL_ROOT`):
    ```
    md-to-pdf collection add <url_or_local_path_to_source> [--name <collection_name_in_coll_root>]
    ```
    Copies/clones a plugin collection *into* `COLL_ROOT`.

2.  Removing a collection from `COLL_ROOT`:
    ```
    md-to-pdf collection remove <collection_name_in_coll_root> [--force]
    ```
    `--force` also disables any plugins from this collection in `enabled.yaml`.

3.  Updating a collection in `COLL_ROOT`:
    ```
    md-to-pdf collection update [<collection_name_in_coll_root>]
    ```
    - If Git-sourced, performs `git fetch` & `reset`.
    - If locally-sourced (added via a local path), re-syncs/copies from that original local source path.

4.  Listing names of collections managed within `COLL_ROOT`:
    ```
    md-to-pdf collection list
    ```

---

This structure clarifies that `md-to-pdf collection add` and `md-to-pdf plugin add` are the explicit steps to bring any set of plugins (collections or singletons from various sources) into the managed `COLL_ROOT` environment. Then, `md-to-pdf plugin enable` acts upon these known, managed collections/plugins.

### Integration & Refinement Plan for v0.8.x

#### Phase 1: Foundation & Initial Command Migration (v0.8.3 - Completed)

1.  **Integrate `CollectionsManager` Core** 

    - **Status:** Integration of `CollectionsManager` class made available to `md-to-pdf/cli.js`.

2.  **Implement `md-to-pdf collection` Subcommands**

    - `add` - **Status:** Ported from `md-to-pdf-cm`
    - `list - **Status:** Ported from `md-to-pdf-cm` (for collection names)
    - `remove` - **Status:** Ported from `md-to-pdf-cm` 
    - `update` (including re-sync for local sources) - **Status:** ~~ported from `md-to-pdf-cm`~~ [**TODO**: Better check this].

3.  **Implement `md-to-pdf plugin enable/disable`** 

    **Status:** Ported from `md-to-pdf-cm`

4.  **Testing:** Hybrid test strategy implemented (`dev/test/cm-tests/`) for direct module tests.

    **Status:** Complete.

#### Phase 2: Unify Core Plugin Workflow & CLI Usability (v0.8.4 - v0.8.6)

*This phase aims to make the CLI the primary and intuitive interface for all common plugin management tasks, minimizing the need for manual configuration file editing for plugins managed within `COLL_ROOT`.*

* **Rationale for Unification**

  Addresses current potential for user confusion arising from:

    * Multiple `list` commands (`collection list`, `plugin list`, old `md-to-pdf-cm list`) with different outputs and scopes.
    * Inconsistent or unclear identifiers used for plugins across different commands (`invoke_name` vs. `collection_name/plugin_id`).
    * Cumbersome process for adding and enabling standalone (singleton) plugins.

4.  **v0.8.4: Unify `md-to-pdf plugin list`**

    * **Goal:** Make `md-to-pdf plugin list` the central command for querying all plugin states.

    * **Enhancements** 

      * Add flags \
        `--available`, `--enabled`, `--disabled` and `[<collection_name_filter>]` \
        The output will be designed to clearly guide users on which identifiers (`invoke_name` or `collection_name/plugin_id`) to use for subsequent commands.

5.  **v0.8.5: Unify `md-to-pdf plugin create` with Archetype Functionality**

    * **Goal:** Make `md-to-pdf plugin create` the single command for generating new plugins, whether from a template or an existing plugin.

    * **Enhancements:**
      
      * Add `--from <source_identifier>` option. \
        If used, behavior mirrors current 
        ```
        collection archetype
        ```
        If not used, archetypes from a new bundled "template" plugin.
      
      * Reconcile `--target-dir` default behaviors.
      
      * The original `plugin_scaffolder.js` logic is superseded by calls to `CollectionsManager.archetypePlugin`.

6. **v0.8.6: Enhance Plugin Addition for Singletons & Finalize Management Efficacy**

   * **Goal:** Ensure the CLI is comprehensive for plugin management, including standalone plugins.
    
   * **Enhancements:** 

     - Implement 
       ```
       md-to-pdf plugin add <path_to_plugin_dir> [--name <invoke_name>]
       ```
       This command will copy a single plugin directory into a managed area within `COLL_ROOT` (e.g., `COLL_ROOT/_singletons/`) and enable it.

#### Phase 3: Deprecation and Documentation Overhaul (v0.8.7 onwards)

7.  **Deprecate `md-to-pdf-cm` Standalone Tool**

    Once all essential functionalities are robustly integrated into `md-to-pdf`, the standalone `md-to-pdf-cm` entry point will be officially deprecated
      1. CLI script will issue a warning and redirect users. 
      2. Eventual removal in v0.9+.

8.  **Comprehensive Documentation Overhaul**

    Update all user-facing documentation:
    - `README.md`
    - `docs/plugin-development.md`
    - `docs/cheat-sheet.md`
    - `src/collections-manager/walkthrough.md`
    
    to reflect the unified `md-to-pdf` CLI. 

9.  **Add Select CLI-Based Integration Tests**

    Implement the deferred "rigorous check" tests for the core CLI workflows of the integrated collection and plugin management commands.

#### Considerations during implementation

* **Error Handling and User Feedback** \
  Ensure consistent and clear messages across all unified commands.

* **Testing** \
  The hybrid testing strategy will continue. New CLI-level integration tests will be added for the unified commands.

* **`PluginRegistryBuilder`** \
  Will primarily rely on `enabled.yaml` for CM-managed plugins. The enhanced `md-to-pdf plugin list` default mode will continue to merge this with traditionally registered plugins.

* **Manual Configuration** \
  Manual registration in `config.yaml` files remains the ultimate override mechanism and is suitable for plugins not managed within `COLL_ROOT` or for advanced/scripted setups.
