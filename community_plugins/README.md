# Community Plugins - md-to-pdf

This guide explains how to integrate collections of extra plugins, such as those from [github.com/brege/md-to-pdf-plugins](https://github.com/brege/md-to-pdf-plugins), into your `md-to-pdf` setup. This is achieved using the `plugin_directory_aliases` feature in your main `md-to-pdf` configuration file (XDG or project-specific).

You can also use this directory structure to add your own plugins as well.

**TODO/** - Future versions of `md-to-pdf` aim to further simplify community plugin management. This may include capabilities to automatically fetch remote plugin repositories into `~/.local/share/md-to-pdf/` and assist in copying specific plugins (or all of them) into your active configuration. - **/TODO**

## Adding and Registering Plugins

#### 1. Organize Your Plugin Sources

Keep plugins from different authors or collections in separate subdirectories. 

```
community_plugins/
├── plugins-from-brege  <-- git@github.com/brege/md-to-pdf-plugins.git
│   ├── advanced-card-red
│   │   ├── advanced-card.config.yaml
│   │   ├── advanced-card.css
│   │   ├── advanced-card-example.md
│   │   ├── index.js
│   │   ├── poop.pdf
│   │   └── README.md
│   ├── hierarchy-table
│   │   ├── hierarchy-table.config.yaml
│   │   ├── hierarchy-table.css
│   │   ├── hierarchy-table-example.md
│   │   ├── index.js
│   │   ├── README.md
│   │   └── test.pdf
│   ├── LICENSE
│   └── README.md
└── README.md           <-- This file
```
*Example directory structure within the project root or other central plugin location*

#### 2. Get the Plugins

Clone or download the plugin collections into your chosen organizational subdirectories.

**Example: Getting plugins from `brege/md-to-pdf-plugins`**
   
```bash
# Navigate to where you want to store community plugins, e.g., 'community_plugins'
mkdir -p community_plugins
cd community_plugins/

# Clone the collection
git clone https://github.com/brege/md-to-pdf-plugins plugins-from-brege
```

#### 3. Configure `md-to-pdf`

Edit your main `md-to-pdf` configuration file (XDG or project-specific).
 
  1. Define **aliases** for the directories where your plugin collections are stored using `plugin_directory_aliases`.
 
  2. Register the **individual plugins** in `document_type_plugins`, using your defined aliases.

**Example `config.yaml`**
```yaml
# --- Plugin Directory Aliases ---
# Paths for alias targets can be absolute, tilde-expanded (~), or relative
# to THIS config file's directory.
plugin_directory_aliases:
  brege_plugins: "./community_plugins/plugins-from-brege" # Example relative path
  # ... other aliases...

# --- Document Type Plugin Registrations ---
document_type_plugins:
  # ... bundled plugins ...
  # Plugins from the 'brege_plugins' alias
  advanced-card-red-brege: "brege_plugins:advanced-card-red/advanced-card-red.config.yaml"
  hierarchy-table-brege: "brege_plugins:hierarchy-table/hierarchy-table.config.yaml"
```
Author-handles or other unique prefixes for plugin registration keys (`advanced-card-red-brege`) can help prevent naming collisions if multiple collections provide plugins with the same functional name.

#### 4. Use Your Plugins

Invoke plugins using the unique names defined in `document_type_plugins`:
```bash
md-to-pdf convert my-doc.md --plugin advanced-card-red-brege
md-to-pdf convert presentation-table-slide1.md --plugin hierarchy-table-brege
```
This method provides a streamlined way to integrate and manage community plugins.

