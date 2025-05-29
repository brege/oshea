# Collections Manager Walkthrough

The `md-to-pdf-cm` (Collections Manager) is a command-line tool for managing plugin collections used by `md-to-pdf`. This guide walks through its common commands.

The default storage location for downloaded collections is `~/.local/share/md-to-pdf/collections/`.

## Prerequisites

* `md-to-pdf` (which includes `md-to-pdf-cm`) should be installed.
* `git` must be installed and accessible in your PATH for adding or updating collections from Git URLs.

## Core Workflow

### 1. Adding a Plugin Collection

Plugin collections can be added from a Git repository URL or a local filesystem path.

**Command**
```bash
md-to-pdf-cm add <url_or_path> [--name <local_alias>]
```

* `<url_or_path>`: The source of the plugin collection.
* `--name <local_alias>`: (Optional) A local name for the collection. If not provided, a name is derived from the source.

**Example**
To add the example plugin collection from `brege/md-to-pdf-plugins` and name it `brege-plugins`:
```bash
md-to-pdf-cm add https://github.com/brege/md-to-pdf-plugins.git --name brege-plugins
```

**Expected Output (summary)**
```
Collections Manager CLI: Attempting to add collection...
  Source: https://github.com/brege/md-to-pdf-plugins.git
  Requested local name: brege-plugins
...
Collection 'brege-plugins' added to:
    /home/user/.local/share/md-to-pdf/collections/brege-plugins
...
```

### 2. Listing Collections and Plugins

Several commands help you see what's available and active.

* **List Downloaded Collections**

    Shows the names of all collection directories in your storage location.
    ```bash
    md-to-pdf-cm list collections
    ```
    *Example Output*
    ```
    Downloaded plugin collections:
      - brege-plugins
      - my-other-collection
    ```

* **List All Available Plugins**

    Shows all usable plugins found within downloaded collections. Can be filtered by collection name.
    ```bash
    md-to-pdf-cm list all 
    # or
    md-to-pdf-cm list all brege-plugins 
    ```
    *Example Output (filtered)*
    ```
    All available plugins in collection "brege-plugins":
      - Plugin ID: advanced-card-red
        Collection: brege-plugins
        Description: An advanced card plugin with a RED theme...
        Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/advanced-card-red/advanced-card-red.config.yaml
      - Plugin ID: hierarchy-table
        Collection: brege-plugins
        Description: Plugin to display a Markdown table as a presentation slide...
        Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/hierarchy-table/hierarchy-table.config.yaml
    ```

* **List Enabled Plugins**

    Shows plugins currently active and ready for use with `md-to-pdf --plugin <invoke_name>`.
    ```bash
    md-to-pdf-cm list enabled
    ```

* **List Disabled Plugins**
    Shows available plugins that are not currently enabled.
    ```bash
    md-to-pdf-cm list disabled
    ```

### 3. Enabling Plugins

To use a plugin with `md-to-pdf`, it must be enabled. When enabled, it's registered with an "invoke name".

* **Enable a Single Plugin**
    ```bash
    md-to-pdf-cm enable <collection_name>/<plugin_id> [--name <custom_invoke_name>]
    ```
    * `<collection_name>/<plugin_id>`: Identifies the plugin (e.g., `brege-plugins/advanced-card-red`).
    * `--name <custom_invoke_name>`: (Optional) If not provided, the `<plugin_id>` is used as the invoke name. Invoke names must be unique.

    *Example*
    ```bash
    md-to-pdf-cm enable brege-plugins/advanced-card-red --name brege-card
    # Plugin "brege-plugins/advanced-card-red" enabled successfully as "brege-card".
    ```

* **Enable All Plugins in a Collection**
    ```bash
    md-to-pdf-cm enable <collection_name> --all [--prefix <prefix_string>] [--no-prefix]
    ```
    * `--prefix <string>`: Prepends a string to each plugin's ID to form the invoke name (e.g., `brege-advanced-card-red`).
    * `--no-prefix`: Uses plugin IDs directly as invoke names. Use with caution to avoid conflicts.
    * Default behavior (no prefixing options): For GitHub sources, often `<username>-<plugin_id>`; for other Git sources, `<collection_name>-<plugin_id>`; for local path sources, `<plugin_id>`.

    *Example*
    ```bash
    md-to-pdf-cm enable brege-plugins --all --prefix brege-
    ```

### 4. Updating a Git-Based Collection

This command updates a collection that was added from a Git source to match its remote.

**Command**
```bash
md-to-pdf-cm update <collection_name>
# or to update all Git-based collections
md-to-pdf-cm update 
```

**Important Considerations for `update`**
* **Overwrite Warning** \
    Local modifications made directly within the managed collection directory (e.g., inside `~/.local/share/md-to-pdf/collections/<collection_name>`) **will be overwritten** by this command as it resets the collection to the remote state.
* **Abort on Local Changes** \
    The update will be aborted if local uncommitted changes or unpushed local commits are detected in the collection's directory. You will be advised to commit, stash, or revert these changes if you wish the update to proceed.
* **Customization Strategy** \
    To preserve your custom changes to a plugin from a Git collection, it's recommended to:
    1.  Clone the original collection to a separate, personal directory (outside the managed `~/.local/share/md-to-pdf/collections/` area).
    2.  Make your modifications there.
    3.  Add this customized local version as a new collection using `md-to-pdf-cm add /path/to/your/customized-collection --name my-custom-<plugin_name>`.
    (A future `archetype` command may simplify creating customizable copies).
* **New Plugins Not Auto-Enabled** \
    This command only syncs the collection files. If the remote update adds new plugins to the collection, they are not automatically enabled. You will need to use the `enable` command to activate them.

**Example**
```bash
md-to-pdf-cm update brege-plugins
```

### 5. Disabling a Plugin

Deactivates an enabled plugin, removing it from the list of plugins `md-to-pdf` can use.

**Command**
```bash
md-to-pdf-cm disable <invoke_name>
```
* `<invoke_name>`: The name the plugin was enabled with.

**Example**
```bash
md-to-pdf-cm disable brege-card
# Plugin "brege-card" disabled successfully.
```

### 6. Removing a Collection

Deletes a downloaded collection from your storage.

**Command**
```bash
md-to-pdf-cm remove <collection_name> [--force]
```
* `--force`: If the collection has any plugins currently enabled, this flag is required. It will automatically disable those plugins before removing the collection directory.

**Example**
```bash
md-to-pdf-cm remove brege-plugins --force
# Collection "brege-plugins" has been removed.
```

