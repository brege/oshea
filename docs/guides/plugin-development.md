# Plugin Development Guide

This guide explains the basics of creating, configuring, and managing plugins for **oshea**.
Plugins are the core of the tool's extensibility, allowing you to define custom processing, styling, and PDF generation options for any type of Markdown document.

---

## The Standard Workflow: Creating a Plugin

The easiest and most reliable way to start a new plugin is with the built-in `plugin create` command. This command generates a complete, standards-compliant boilerplate directory, including all necessary configuration, scripts, and documentation.

### Command Syntax

```bash
oshea plugin create <new-plugin-name> \
        [ --outdir <path> ] \
        [ --from <source-plugin> ] \
        [ --force ]
```

**`plugin create`**

- **`<new-plugin-name>`**: The name for your new plugin (e.g., `technical-report`).
- `--outdir <path>` (Optional): The directory where the new plugin folder will be created. Defaults to a local `my-plugins` directory in your project.
- `--from <source>` (Optional): Use an existing plugin as a template. The source can be a registered plugin name (e.g., `cv`) or a path to a plugin directory.
- `--force` (Optional): Overwrite the target directory if it already exists.

This command creates a fully functional plugin with a standard structure, including a `.contract/` directory for in-situ testing and a machine-readable schema file, which helps ensure forward compatibility.

**Example**
To create a plugin based on the `cv` plugin, run the following command:

```bash
oshea plugin create my-plugin --from cv --outdir ./my-plugins
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
oshea plugin validate my-plugins/business-card
```

### Step 2: Install and Use Your Plugin

Use `plugin add` to install a single plugin into oshea's managed plugin root and enable it.

Add from a local directory
```bash
oshea plugin add ./my-plugins/business-card
```

Or add from a Git repository that contains one plugin
```bash
oshea plugin add https://github.com/user/my-awesome-plugin
```

### Step 3: Iterate and Update

After modifying your source plugin files in `./my-plugins/business-card`, reinstall to refresh the managed copy:

```bash
oshea plugin remove business-card
oshea plugin add ./my-plugins/business-card
```

Having registered your plugin, you can now convert a document using your plugin by name. The `plugin enable` command (which `plugin add` uses internally) automatically runs the validator, ensuring that only safe and valid plugins are activated.
```bash
oshea convert document.md --plugin business-card
```

In local development, the tight loop is `plugin validate` plus `plugin remove`/`plugin add` when you want to refresh the installed copy.

### A Flexible and Portable System

This plugin system is intentionally narrow: install single-plugin sources, validate, and run.
That keeps document behavior easier to reason about while preserving portability.
