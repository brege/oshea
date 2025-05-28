# Collections Manager Walkthrough
### Adding and Enabling Plugins

This walkthrough demonstrates how to use the `md-to-pdf-cm` (Collections Manager) command-line tool to add an external plugin collection, view its available plugins, and enable them for use with the main `md-to-pdf` application.

We'll use the `brege/md-to-pdf-plugins` repository (available at `https://github.com/brege/md-to-pdf-plugins.git`) as our example collection. This repository contains a couple of example plugins like `advanced-card-red` and `hierarchy-table`.

**Prerequisites:**
* `md-to-pdf` and its `md-to-pdf-cm` tool should be installed and accessible in your PATH.
* `git` must be installed and accessible in your PATH for adding collections from Git URLs.

## Step 1: Initial Cleanup (Optional)

If you've worked with this collection before, you might want to remove it and any previously enabled plugins from it for a clean start.

```bash
# Remove the 'brege-plugins' collection if it already exists.
# The --force flag will also disable any plugins that were enabled from it.
md-to-pdf-cm remove brege-plugins --force
```
You might see a message like "Collection "brege-plugins" not found" if it wasn't there, which is fine.

## Step 2: Add the Plugin Collection

Next, we add the external plugin collection. We'll use the `--name` option to give it a local alias `brege-plugins`.

```bash
md-to-pdf-cm add https://github.com/brege/md-to-pdf-plugins.git --name brege-plugins
```

You should see output indicating that the repository is being cloned into your Collections Manager root directory (e.g., `~/.local/share/md-to-pdf/collections/brege-plugins`).

```
Collections Manager CLI: Attempting to add collection...
  Source: [https://github.com/brege/md-to-pdf-plugins.git](https://github.com/brege/md-to-pdf-plugins.git)
  Requested local name: brege-plugins
CollectionsManager: Adding collection from source: [https://github.com/brege/md-to-pdf-plugins.git](https://github.com/brege/md-to-pdf-plugins.git)
  Requested local name: brege-plugins
  Target collection name: brege-plugins
  Target path: /home/user/.local/share/md-to-pdf/collections/brege-plugins
  Source is a Git repository. Attempting to clone with git from '[https://github.com/brege/md-to-pdf-plugins.git](https://github.com/brege/md-to-pdf-plugins.git)'...
  GIT (stderr): Cloning into '/home/user/.local/share/md-to-pdf/collections/brege-plugins'...

  Successfully cloned '[https://github.com/brege/md-to-pdf-plugins.git](https://github.com/brege/md-to-pdf-plugins.git)' to '/home/user/.local/share/md-to-pdf/collections/brege-plugins'.

Collection 'brege-plugins' added to:
    /home/user/.local/share/md-to-pdf/collections/brege-plugins

To list its plugins, use:
    md-to-pdf-cm list available brege-plugins
...
```

## Step 3: List Available Plugins

Now, let's see which plugins are available within the newly added `brege-plugins` collection.

```bash
md-to-pdf-cm list available brege-plugins
```

The output should list the plugins found in that collection, including their descriptions and config paths:
```
Available plugins in collection "brege-plugins":
  - Plugin ID: advanced-card-red
    Collection: brege-plugins
    Description: An advanced card plugin with a RED theme, demonstrating custom HTML and dynamic content.
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/advanced-card-red/advanced-card-red.config.yaml
  - Plugin ID: hierarchy-table
    Collection: brege-plugins
    Description: Plugin to display a Markdown table as a presentation slide, ideal for hierarchies or structured data.
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/hierarchy-table/hierarchy-table.config.yaml
```

## Step 4: Enable All Plugins (No Prefix)

Let's enable all available plugins from the `brege-plugins` collection. Their invoke names will default to their plugin IDs.

```bash
md-to-pdf-cm enable brege-plugins --all
```

Expected output:
```
Collections Manager CLI: Attempting to enable all plugins in collection...
  Collection Name: brege-plugins
Plugin "brege-plugins/advanced-card-red" enabled successfully as "advanced-card-red".
Plugin "brege-plugins/hierarchy-table" enabled successfully as "hierarchy-table".
Batch enablement for collection "brege-plugins": 2 of 2 plugins enabled.
  - advanced-card-red (from brege-plugins/advanced-card-red) : enabled
  - hierarchy-table (from brege-plugins/hierarchy-table) : enabled

Successfully processed enabling all plugins from "brege-plugins". Check details above.
```

## Step 5: Verify Enabled Plugins

Check the list of all enabled plugins to confirm.

```bash
md-to-pdf-cm list enabled
```
This should show `advanced-card-red` and `hierarchy-table` as enabled.
```
Enabled plugins:
  - Invoke Name: advanced-card-red
    Original ID: brege-plugins/advanced-card-red
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/advanced-card-red/advanced-card-red.config.yaml
    Enabled On: <timestamp>
  - Invoke Name: hierarchy-table
    Original ID: brege-plugins/hierarchy-table
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/hierarchy-table/hierarchy-table.config.yaml
    Enabled On: <timestamp>
```

## Step 6: Disable Plugins (Preparation for Next Test)

To test enabling with a prefix, let's first disable the plugins we just enabled.

```bash
md-to-pdf-cm disable advanced-card-red
md-to-pdf-cm disable hierarchy-table
```
You should see confirmation messages for each. You can run `md-to-pdf-cm list enabled` again to confirm no plugins are enabled.

## Step 7: Enable All Plugins (With a Prefix)

Now, enable all plugins from `brege-plugins` again, but this time, let's add a prefix `brege_` to their invoke names. This is useful for avoiding naming conflicts if you have many collections.

```bash
md-to-pdf-cm enable brege-plugins --all --prefix brege-
```

Expected output:
```
Collections Manager CLI: Attempting to enable all plugins in collection...
  Collection Name: brege-plugins
  Using prefix for invoke names: brege_
Plugin "brege-plugins/advanced-card-red" enabled successfully as "brege-advanced-card-red".
Plugin "brege-plugins/hierarchy-table" enabled successfully as "brege-hierarchy-table".
Batch enablement for collection "brege-plugins": 2 of 2 plugins enabled.
  - brege-advanced-card-red (from brege-plugins/advanced-card-red) : enabled
  - brege-hierarchy-table (from brege-plugins/hierarchy-table) : enabled

Successfully processed enabling all plugins from "brege-plugins". Check details above.
```

## Step 8: Verify Prefixed Enabled Plugins

Check the list of enabled plugins one last time.

```bash
md-to-pdf-cm list enabled
```
The output should now show the plugins enabled with the `brege-` prefix:
```
Enabled plugins:
  - Invoke Name: brege-advanced-card-red
    Original ID: brege-plugins/advanced-card-red
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/advanced-card-red/advanced-card-red.config.yaml
    Enabled On: <timestamp>
  - Invoke Name: brege-hierarchy-table
    Original ID: brege-plugins/hierarchy-table
    Config Path: /home/user/.local/share/md-to-pdf/collections/brege-plugins/hierarchy-table/hierarchy-table.config.yaml
    Enabled On: <timestamp>
```

