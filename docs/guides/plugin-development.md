# Plugin Development Guide

This guide explains the basics of creating, configuring, and managing plugins for `md-to-pdf`. 
Plugins are the core of the tool's extensibility, allowing you to define custom processing, styling, and PDF generation options for any type of Markdown document.

---

## The Standard Workflow: Creating a Plugin

The easiest and most reliable way to start a new plugin is with the built-in `plugin create` command. This command generates a complete, standards-compliant boilerplate directory, including all necessary configuration, scripts, and documentation.

### Command Syntax

```bash
md-to-pdf plugin create <new-plugin-name> \
        [ --output-dir <path> ] \
        [ --from <source-plugin> ] \
        [ --force ]
```

**`plugin create`**

- **`<new-plugin-name>`**: The name for your new plugin (e.g., `technical-report`).
- `--output-dir <path>` (Optional): The directory where the new plugin folder will be created. Defaults to `./`.
- `--from <source>` (Optional): Use an existing plugin as a template. The source can be a registered plugin name (e.g., `cv`) or a path to a plugin directory.
- `--force` (Optional): Overwrite the target directory if it already exists.

This command creates a fully functional plugin with a standard structure, including a `.contract/` directory for in-situ testing, and a machine-readable schema file which helps ensure forward compatibility.

**Example** \ 
To create a plugin based on the `cv` plugin, run the following command:

```bash
md-to-pdf plugin create my-plugin --from cv --target-dir ./my-plugins
```

---

## Plugin Anatomy

A plugin is a self-contained directory that bundles all the necessary assets for a specific document type.

### The Configuration File (`<plugin-name>.config.yaml`)

This is the plugin's manifest. It defines the plugin's identity and default behavior.

**Metadata:**

  * `plugin_name`: (string, required) The official name, which **must** match the directory name.
  * `version`: (string, required) The plugin's version (e.g., `"1.0.0"`).
  * `protocol`: (string, required) The contract version this plugin adheres to. Must be `"v1"`.
  * `description`: (string, required) A brief, user-facing description.

**Layout and Document Design:**

  * `handler_script`: (string, required) Path to the Node.js handler script, relative to this config file (e.g., `"index.js"`).
  * `css_files`: (array) A list of CSS files to apply, relative to this config file.
  * `pdf_options`: (object) Default Puppeteer PDF options (e.g., `format`, `margin`).
  * `inject_fm_title_as_h1`: (boolean) If `true`, injects the `title` from front matter as an H1 heading.

### The Handler Script (`index.js`)

Your exported handler class is instantiated with a `coreUtils` object passed to its `constructor`. This object provides safe access to the application's core modules. The class must also implement an `async generate()` method.

```javascript
// my-plugin/index.js
class MyPluginHandler {
    constructor(coreUtils) {
        // Store the injected utilities for use in the generate method
        this.markdownUtils = coreUtils.markdownUtils;
        this.pdfGenerator = coreUtils.pdfGenerator;
        this.DefaultHandler = coreUtils.DefaultHandler; // Class definition
    }

    async generate(data, pluginConfig, globalConfig, outputDir) {
        // ... implementation ...
    }
}
module.exports = MyPluginHandler;
```

---

## The Development Lifecycle

### Step 1: Validate Your Plugin

The `plugin validate` command is your primary tool for ensuring your plugin meets the required contract. It checks file structure, configuration, and runs any in-situ tests to verify forward compatibility with the core application.

```bash
md-to-pdf plugin validate my-plugins/business-card
```

### Step 2: Register and Use Your Plugin

There are two primary ways to make your plugin available to the CLI:

#### Method A: Standard Usage with `plugin add` and `collection add`

This is the recommended method for both end-users and developers. The `add` commands can accept a local path or a remote Git repository URL.

**For a single plugin** 

Use `plugin add` to copy your local plugin directory into the tool's managed collections and make it globally available by name.

Add from a local directory
```bash
md-to-pdf plugin add ./my-plugins/business-card
```

Or, add directly from a GitHub repository
```bash
md-to-pdf plugin add https://github.com/user/my-awesome-plugin
```

**For a collection of plugins**

If you have a repository containing multiple plugins, users can add the entire set with a single command. This is ideal for distributing themes, variants, or related toolsets.

Add a collection from a local directory
```bash
md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins
```

#### Method B: Developer Convenience with `collections_root`

For developers managing multiple, distinct *sets* of plugins, the `collections_root` setting in `config.yaml` provides an **exclusive context switch**. 
When you run a command with this configuration, the application operates *exclusively* within that universe of plugins.

Different scenarios involving i/o of both `--config` and `--coll-root` may creatively provide or lead to different results.

This allows you to maintain isolated environments for different projects without affecting your global configuration.

**`my-project/config.yaml`**
```yaml
collections_root: ./my-company-plugins
```

### Step 3: Iterate and Update

After modifying your source files in some local development directory like `./my-plugins/business-card`, you can update your plugin with the following commands:

```bash
md-to-pdf collection update _user_added_plugins
```

Having registered your plugin, you can now convert a document using your plugin by name. The `plugin enable` command (which `plugin add` uses internally) automatically runs the validator, ensuring that only safe and valid plugins are activated.
```bash
md-to-pdf document.md --plugin business-card
```

In your local environment, you may find yourself using `plugin validate` locally and `collection update` globally to smoke test a plugin in different states of development and production.

### A Flexible and Portable System

This dual system for plugin management was a foundational design goal. 
It provides flexibility for users to easily consume plugins from anywhere, 
while giving developers useful switches like `collections_root` and hierarchical configuration states to manage complex, project-specific contexts.

The plugin architecture provides portability and extensibility through these two logical switches,
making it easier to manage local development or distribution to a wider audience.

