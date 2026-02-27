# The Plugin Contract

This document outlines the formal contract that all plugins for **oshea** must adhere to. It serves as a guide for plugin developers, ensuring that plugins are reliable, predictable, and integrate smoothly with the core application.

The contract is enforced at runtime by a validation system ([`src/plugins/plugin-validator.js`](../../src/plugins/plugin-validator.js)) that uses JSON Schemas. Every plugin's configuration is checked against a base schema, and optionally against its own specific schema.

## Standard Directory Structure

A plugin must follow a specific file structure to be considered valid. This structure separates the core functional files from supporting documentation and validation assets, creating an intuitive layout for developers.

```
plugins/my-plugin/
├── my-plugin.config.yaml      # REQUIRED: The plugin's manifest and primary metadata.
├── index.js                   # REQUIRED: The handler script.
├── README.md                  # REQUIRED: The primary human-readable documentation.
├── my-plugin-example.md       # REQUIRED: A self-activating example file.
├── my-plugin.css              # OPTIONAL: Core CSS, as defined in config.
│
└── .contract/                 # OPTIONAL: Houses machine-readable/validation assets.
    ├── my-plugin.schema.json  # OPTIONAL: The structural contract for the config.
    └── test/                  # OPTIONAL: Co-located tests.
        └── my-plugin-e2e.test.js
```

## The Primary Manifest: `<plugin-name>.config.yaml`

The `.config.yaml` file is the heart of the plugin. It is the **single source of truth** for the plugin's identity and its default configuration.

### Required Metadata Properties

These properties **must** be present in every plugin's configuration file.

#### `plugin_name`

- **Type:** `string`
- **Purpose:** The official, unique name of the plugin. This value **must** match the plugin's directory name.
- **Example:** `"cv"`

#### `version`

- **Type:** `string`
- **Purpose:** The version of the plugin, preferably following [SemVer](https://semver.org/).
- **Example:** `"1.0.0"`

#### `protocol`

- **Type:** `string`
- **Purpose:** The version of the **oshea** plugin contract this plugin adheres to. For this version, it must be `"v1"`.
- **Example:** `"v1"`

#### `description`

- **Type:** `string`
- **Purpose:** A brief, user-facing description of what the plugin does. This is used in help text and other UI elements to inform the user.
- **Example:** `"A plugin for creating a professional two-column CV."`

#### `handler_script`

- **Type:** `string`
- **Purpose:** The path to the Node.js module that serves as the plugin's entry point. This path is relative to the location of the plugin's configuration file.
- **Example:** `"index.js"`

### Core Optional Properties

These are standard properties that plugins can use to hook into **oshea**'s functionality.

#### `pdf_options`

- **Type:** `object`
- **Purpose:** Defines default PDF generation options for this plugin, following the [Puppeteer `pdfOptions`](https://pptr.dev/api/puppeteer.pdfoptions) format. These values can be overridden by the user's global, project, or local configurations.
- **Example:**
   ```yaml
   pdf_options:
     format: 'Letter'
     printBackground: true
     margin:
       top: '0.5in'
       bottom: '0.5in'
   ```

#### `css_files`

- **Type:** `array` of `string`s
- **Purpose:** A list of CSS files to be applied to the document. Paths are resolved relative to the plugin's configuration file.
- **Example:** `css_files: ["cv.css"]`

#### `math`

- **Type:** `object`
- **Purpose:** Configures KaTeX math rendering options for the plugin.
- **Example:**
   ```yaml
   math:
     enabled: true
   ```

#### `toc_options`

- **Type:** `object`
- **Purpose:** Configures the Table of Contents generation for the plugin.
- **Example:**
   ```yaml
   toc_options:
     enabled: false
   ```

#### `watch_sources`

- **Type:** `array` of `object`s
- **Purpose:** Defines additional files or directories for **oshea** to monitor in `--watch` mode. This is useful for plugins that depend on external assets not directly referenced in the Markdown or CSS.
- **Example:**
   ```yaml
   watch_sources:
     - path: "./assets"
       type: "directory"
     - path: "./data.json"
       type: "file"
   ```

#### Front Matter Placeholders

- **Type:** Markdown front matter object
- **Purpose:** Placeholder replacement uses document front matter values at render time (for example `{{ author }}` or `{{ .contact.email }}`).
- **Example:**
   ```yaml
   ---
   title: "My Document"
   author: "Your Name"
   contact:
     email: "you@example.com"
   ---
   ```

---

## Extending the Contract

Plugins can extend the base contract by providing their own schema file, located at `.contract/<plugin_name>.schema.json`. This allows plugins to define their own custom properties and enforce specific constraints.

When a plugin-specific schema is present, it is merged with the base schema. See `plugins/cv/.contract/cv.schema.json` for an example.
