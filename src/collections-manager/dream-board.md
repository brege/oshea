# Plugin Manager - Collections "Dream-Board"

## Core Architectural Assumptions

* **New Module:** `CollectionsManager` \
  Initially `src/collections_manager/` will be the location of this module.  The module will be build to not have backwards dependency on the main porject, `md-to-pdf`.

* **`COLL_ROOT`:** Collections root directory \
  Default `~/.lcal/share/md-to-pdf/collections/`, project-overridable.

* **Enabled Plugins Manifest** \
  `COLL_ROOT/enabled.yaml` managed by `CollectionsManager`.

* **Integration** \
  `PluginRegistryBuilder.js` reads `enabled.yaml`.

---

### Add a collection 
#### `md-to-pdf collections add <url_or_path> [--name <collection_name>]`

**Action** 
* Downloads (`git clone`) or copies a plugin collection into your active `COLL_ROOT`.

The `<collection_name>` will be the directory name for this collection within `COLL_ROOT`.

**Arguments** \
**`<url_or_path>`**
  * The source URL (e.g., a GitHub repository link) or local filesystem path to the plugin collection.

**Options** \
`--name <collection_name>`
  * Optional. Specifies the local directory name for this collection inside `COLL_ROOT`.

    If not provided, a name is automatically derived from the source URL or path 
    - `user1-md-to-pdf-plugins`

**Output** 
```text
Collection 'user1-md-to-pdf-plugins' added to:
    
    ~/.local/share/md-to-pdf/collections/user1-md-to-pdf-plugins

To list its plugins, use

    md-to-pdf collections list available user1-md-to-pdf-plugins

To activate plugins from this collection, use

    md-to-pdf collections enable
```

### List Collections

#### List Downloaded Collections
#### `md-to-pdf collections list [downloaded|available|enabled] [<collection_name>]`

**Action** 
* Lists downloaded plugin collections, or individual plugins within them.

**Variations**
```bash
md-to-pdf collections list downloaded
```
Shows the names of all plugin collections currently downloaded in your active `COLL_ROOT`.

**Output**
```
Downloaded plugin collections:
  user1_md_to_pdf_plugins
  my_awesome_plugins
```

#### List Available Plugins from a Downloaded Collection
#### `md-to-pdf collections list available [<collection_name>]`

**Action**
* Shows individual plugins found within a specific downloaded collection.
* Shows all available plugins from all collections if no `<collection_name>` is given

This lists plugins that are valid but *not yet enabled*.

**Output**
```
Available plugins in 'user1_md_to_pdf_plugins':
  plug_A
  plug_B
  plug_C
```

#### List Enabled Plugins from a Downloaded Collection
#### `md-to-pdf collections list enabled [<collection_name>]`

**Action**
* Shows plugins that are currently enabled and active for use.

Can be filtered by their original `<collection_name>`.

**Output**
```
Enabled plugins:
  my_cv             [ from my_awesome_plugins/cv ]
  user1_C_variant   [ from user1_md_to_pdf_plugins/plug_C ]
```

---

### Enable a Plugin
#### `md-to-pdf collections enable <collection_name>/<plugin_id> [--as <invoke_name>]`

**Action**
* Activates a specific plugin, identified by its `<plugin_id>` (usually its directory name), from a downloaded `<collection_name>`. 

This adds the plugin to the `enabled.yaml` manifest in your `COLL_ROOT`, making it usable with `md-to-pdf --plugin`.

**Arguments** \
`<collection_name>/<plugin_id>` \
The path-like identifier for the plugin (e.g., `user1_md_to_pdf_plugins/plugA`).

**Options** 
  
  * `--as <invoke_name>`

    (*Optional*). This sets the unique, **callable** name you will use to invoke this plugin: \
    i.e., `md-to-pdf --plugin <invoke_name>`

If omitted, a default unique name like `<collection_name>_<plugin_id>` is generated.

**Output** 
```
Plugin 'user1_md_to_pdf_plugins/plugA' enabled as 'user1_plugA'
Use with: md-to-pdf convert mydoc.md --plugin user1_plugA
```

---

#### Enable All Plugins from a Collection
#### `md-to-pdf collections enable <collection_name> --all [--prefix <prefix_string>]`

**Action** 
* Activates all valid plugins found within the specified `<collection_name>`.

**Arguments** \
`<collection_name>` \
The name of the downloaded collection.

**Options** 

* `--all` 

  Flag to enable all plugins in the collection.

* `--prefix <prefix_string>`

  Strongly recommended when using `--all`. This string is prepended to each plugin's ID from the collection to create unique invocation names (e.g., `<prefix_string><plugin_id>`), helping to prevent conflicts. \
  Their github username should suffice.

**Output** 
```
Enabled all plugins from 'user1_md_to_pdf_plugins' with prefix 'user1_'
```
*Optionally, could list the full set of newly enabled plugins or refer to `md-to-pdf collections list enabled`*

---

### Disable a Plugin
#### `md-to-pdf collections disable <invoke_name>`

**Action** 
* Deactivates an enabled plugin by removing its entry from the `enabled.yaml` manifest.
The `<invoke_name>` is the name under which the plugin was enabled.

**Arguments** \
`<invoke_name>` \
The current invocation name of the plugin to disable.

**Output**
```
Plugin 'user1_plugA' disabled.
```

---

### Remove a Collection
#### `md-to-pdf collections remove <collection_name> [--force]`

**Action**
* Deletes the specified `<collection_name>` directory from `COLL_ROOT`.

**Arguments** \
`<collection_name>` \
The name of the downloaded collection to remove.

**Options** 

* `--force`

  If any plugins from this collection are currently enabled, this flag is required to proceed. Using `--force` will also automatically disable those plugins before removing the collection.

**Output**
```
Collection 'user1_md_to_pdf_plugins' and its enabled plugins have been removed.
```

---

### Update (all) Collection(s)
#### `md-to-pdf collections update [<collection_name>]` 

**Action**
* Updates the local copy of a plugin collection from a Git repository.

For collections that were added from a Git URL, this command would attempt to update the local copy by running `git pull` within the collection's directory in `COLL_ROOT`.
If no `<collection_name>` is specified, it could try to update all Git-based collections.

**Arguments** \
`<collection_name>` \
Optional. The specific collection to update.

**Output**
```
Collection 'user1_md_to_pdf_plugins' updated.
```
or 
``` 
Updating all git-based collections from 

'user1_md_to_pdf_plugins'... [OK]
'my_awesome_plugins'... [OK]

All collections updated.
```
