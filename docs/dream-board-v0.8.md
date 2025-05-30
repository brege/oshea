## Dream Board v0.8: Unified Plugin + Collection Management

### Core Philosophy

`md-to-pdf` provides a unified command-line interface to manage both plugin *sources* (collections) and individual *plugins*. The `~/.local/share/md-to-pdf/collections/` directory (`COLL_ROOT`) is the primary managed area for plugin collections that `md-to-pdf` uses. 

Users can develop or archetype plugins elsewhere (e.g., `~/.local/share/md-to-pdf/my-plugins/` or project-local paths) and then `add` them as collections into `COLL_ROOT` to make them available for enabling. The `enabled.yaml` manifest within `COLL_ROOT` primarily governs which plugins from these managed collections are active for `md-to-pdf`.  

While at the onset of the v0.8 series doesn't currently support updates from local sandbozes *not* managed by Git, there is some sense of applying an analogue version of git pull to these local sandboxes via rsync--or rather, some node tool isomorphic to rsync for our intend task of pseudo-cloning.  The seperation of 

  1. Editing a piece of code for a plugin in one locations, then

  2. Then running `md-to-pdf-cm update`

is a natural development workflow.

### Proposed Unified CLI Structure

#### I. Core Conversion & Info Commands - Existing `md-to-pdf` base

* `md-to-pdf <markdownFile> [options]`
* `md-to-pdf convert <markdownFile> [--plugin <nameOrPath>] [options]`
* `md-to-pdf generate <pluginName> [plugin-specific-options...] [options]`
* `md-to-pdf config [--plugin <pluginName>] [--pure]`
* `md-to-pdf help`

#### II. Plugin Management - `md-to-pdf plugin ...`

*Focuses on individual plugins and their lifecycle for use by the converter.*

1. Creation of new plugins:
   ```
   md-to-pdf plugin create <new-plugin-name> [--from <collection_name/source_plugin_id>] [--target-dir <path>] [--force]
   ```
   
   * If `--from` is used, it archetypes from a plugin within `COLL_ROOT`.
    
   * `--target-dir` defaults to:

     - `./<new-plugin-name>` if creating from template
     
     - `../my-plugins/<new-plugin-name>` (relative to `COLL_ROOT`) if archetyping (to encourage out-of-`COLL_ROOT` initial development for archetypes). \
        *This default target for archetyping is a refinement.*


2. Activate plugin(s) from a collection within `COLL_ROOT` by updating `COLL_ROOT/enabled.yaml`:
   ```
   md-to-pdf plugin enable <collection_name/plugin_id | collection_name --all> [--name <invoke_name>] [--prefix <prefix_string>] [--no-prefix]
   ```

3. Deactivate a plugin by removing it from `COLL_ROOT/enabled.yaml`:
   ```
   md-to-pdf plugin disable <invoke_name>
   ```

4. Listing plugins:
   ```
   md-to-pdf plugin list [--available | --enabled | --disabled] [<collection_name_filter>]
   ```
   
   * `--available`: Lists plugins within specified `COLL_ROOT` collection(s) that *can be* enabled.
   * `--enabled`: Lists plugins currently active from `enabled.yaml`.
   * `--disabled`: Lists available plugins in `COLL_ROOT` that are not currently enabled.
   
   Default (no type flag): Lists plugins registered via traditional `config.yaml` `plugins:` key AND those enabled via `enabled.yaml`, providing a complete view of what `md-to-pdf` can use. (This is an important clarification for the default list).

5. Showing help for a plugin: 
   ```
   md-to-pdf plugin help <pluginName>
   ```

#### III. Collection Management (`md-to-pdf collection ...`)

*Focuses on managing the plugin "sources" or directories that are stored and managed within `COLL_ROOT`.*

1. Adding a new collection of plugins (to `COLL_ROOT`): 
   ```
   md-to-pdf collection add <url_or_local_path_to_source> [--name <collection_name_in_coll_root>]
   ```
   * Copies/clones a plugin collection *into* `COLL_ROOT` under `<collection_name_in_coll_root>`.

   * The `<url_or_local_path_to_source>` can point to a Git repo, a directory in `my-plugins/`, or any other local path containing a collection of plugins.

2. Removing a collection from `COLL_ROOT`:
   ```
   md-to-pdf collection remove <collection_name_in_coll_root> [--force]
   ```
   `--force` also disables any plugins from this collection in `enabled.yaml`.

3. Updating a collection in `COLL_ROOT`: 
   ```
   md-to-pdf collection update [<collection_name_in_coll_root>]
   ```
   * If Git-sourced, performs `git fetch` & `reset`.
   
   * **New Refinement** \
     If locally-sourced 
     (i.e., added via a local path, like an archetyped plugin from `my-plugins/`),
     it would re-sync/copy from that original local source path 
     (which is stored in its `.collection-metadata.yaml`) 
     into the `COLL_ROOT` version.

4. Listing names of collections currently present and managed within `COLL_ROOT`:
   ```
   md-to-pdf collection list
   ```

---

This structure clarifies that `md-to-pdf collection add` is the explicit step to bring any set of plugins (from Git, from your local `my-plugins` dev area, etc.) into the managed `COLL_ROOT` environment. Then, `md-to-pdf plugin enable` acts upon these known, managed collections.

### Achievable Steps to Integrate `md-to-pdf-cm` into `md-to-pdf`:


#### Phase 1: Foundation & Initial Command Migration

1. **Integrate `CollectionsManager` Core** 
   
   Make the `CollectionsManager` class (from `dev/src/collections-manager/index.js`) directly available to the main `md-to-pdf` `cli.js`. This might involve:

   * Treating `src/collections-manager/` as a subdirectory providing a core library.
   
   * No separate `md-to-pdf-cm` binary anymore.

2. **Implement `md-to-pdf collection` Subcommands**
   * In `md-to-pdf/cli.js`, create the `collection` command group.
   * Implement `md-to-pdf collection add`: Port logic from `md-to-pdf-cm add`.
   * Implement `md-to-pdf collection list`: Port logic from `md-to-pdf-cm list collections`.
   * Implement `md-to-pdf collection remove`: Port logic from `md-to-pdf-cm remove`.
   * Implement `md-to-pdf collection update`: Port logic from `md-to-pdf-cm update`.
     * **Enhancement** \
     Add the logic to `collection update` to handle re-syncing for locally-sourced collections from their original path.

3. **Implement `md-to-pdf plugin enable/disable`**
   * In `md-to-pdf/cli.js`, create/enhance the `plugin` command group.
   * Implement `md-to-pdf plugin enable`: Port logic from `md-to-pdf-cm enable` (single and `--all`).
   * Implement `md-to-pdf plugin disable`: Port logic from `md-to-pdf-cm disable`.

#### Phase 2: Unify Listing and Creation Commands

4. **Unify `md-to-pdf plugin list`**
   
   Modify the existing `md-to-pdf plugin list` to achieve the comprehensive listing described above (showing plugins from traditional registration AND `enabled.yaml`).

   This will require `PluginRegistryBuilder` to not only read `enabled.yaml` but also to potentially query `CollectionsManager` for "available but not enabled" plugins if a specific flag like `--available` is given.

5. **Unify `md-to-pdf plugin create` with Archetype**
   * Modify `md-to-pdf plugin create` to support the `--from` flag.
   * Port the core logic of `md-to-pdf-cm archetype` into `plugin_scaffolder.js` or a similar module, callable by `plugin create --from ...`.
   * Implement the `md-to-pdf plugin archetype` alias.

#### Phase 3: Deprecation and Cleanup

6. **Deprecate `md-to-pdf-cm`**
   
   Once all functionalities are smoothly integrated into `md-to-pdf`, the standalone `md-to-pdf-cm` entry point can be officially deprecated and eventually removed.

7. **Documentation Overhaul**
   
   Update all documentation:
   - `README.md`
   - `plugin-development.md`
   - `cheat-sheet.md`
   - `walkthrough.md`

   to reflect the single, unified CLI.

#### Considerations during implementation

* **Error Handling and User Feedback**: Ensure consistent and clear messages across all unified commands.

* **Testing**: Each phase of migration will require careful testing, adapting existing tests from `md-to-pdf-cm` and the main tool, and adding new ones for the unified behavior.

* **`PluginRegistryBuilder`**: Will need to correctly interact with the `enabled.yaml` (as it does now post-v0.8.1) and potentially with `CollectionsManager` methods if `plugin list --available` needs to query raw collections.
