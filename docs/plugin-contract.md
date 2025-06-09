# The md-to-pdf Plugin Contract

This document outlines the formal contract that all plugins for `md-to-pdf` must adhere to. It serves as a guide for plugin developers, ensuring that plugins are reliable, predictable, and integrate smoothly with the core application.

The contract is enforced at runtime by a validation system that uses JSON Schemas. Every plugin's configuration is checked against a base schema, and optionally against its own specific schema.

## The Base Contract: `base-plugin.schema.json`

Every plugin configuration file (e.g., `my-plugin.config.yaml`) is validated against a base schema that defines the core set of properties available to all plugins.

### Required Properties

These properties **must** be present in every plugin's configuration file.

#### `description`
- **Type:** `string`
- **Purpose:** A brief, user-facing description of what the plugin does. This is used in help text and other UI elements to inform the user.
- **Example:** `"A plugin for creating a professional two-column CV."`

#### `handler_script`
- **Type:** `string`
- **Purpose:** The path to the Node.js module that serves as the plugin's entry point. This path is relative to the location of the plugin's configuration file. The script is responsible for executing the plugin's primary logic.
- **Example:** `"index.js"`

### Core Optional Properties

These are standard properties that plugins can use to hook into `md-to-pdf`'s functionality.

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

#### `params`
- **Type:** `object`
- **Purpose:** Defines default parameters (variables) that are specific to the plugin. These can be used as placeholders in Markdown files and will be replaced during processing.
- **Example:**
  ```yaml
  params:
    author: "Your Name"
    primary_color: "#333333"
  ```

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
- **Purpose:** Defines additional files or directories for `md-to-pdf` to monitor in `--watch` mode. This is useful for plugins that depend on external assets not directly referenced in the Markdown or CSS.
- **Example:**
  ```yaml
  watch_sources:
    - path: "./assets"
      type: "directory"
    - path: "./data.json"
      type: "file"
  ```

#### `inject_fm_title_as_h1`
- **Type:** `boolean`
- **Purpose:** If `true`, the `title` field from the Markdown file's front matter will be automatically injected as the main H1 heading at the beginning of the generated HTML.
- **Example:** `inject_fm_title_as_h1: true`

#### `aggressiveHeadingCleanup`
- **Type:** `boolean`
- **Purpose:** If `true`, this option instructs `md-to-pdf` to remove any existing H1 (prefixed with `# `) or H2 (prefixed with `## `) headings found within the Markdown content. This is useful when the plugin or other configurations are expected to generate the main headings.
- **Example:** `aggressiveHeadingCleanup: false`

---

## Extending the Contract

Plugins can extend the base contract by providing their own schema file, conventionally named `<plugin_name>.schema.json`. This allows plugins to define their own custom properties and enforce specific constraints.

When a plugin-specific schema is present, it is merged with the base schema.

### Example: The `cv` Plugin Schema

The `cv` plugin needs to enforce that the `format` option within `pdf_options` is either 'A4' or 'Letter'. It does this by extending the base contract.

**`plugins/cv/cv.schema.json`:**
```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "title": "CV Plugin Schema",
  "description": "Defines the structure for the cv.config.yaml file, extending the base plugin schema with CV-specific rules.",
  "type": "object",
  "allOf": [
    {
      "$ref": "base-plugin.schema.json"
    }
  ],
  "properties": {
    "pdf_options": {
      "type": "object",
      "properties": {
        "format": {
          "description": "The paper size. For CVs, 'A4' or 'Letter' are most common.",
          "enum": ["A4", "Letter"]
        }
      }
    }
  }
}
```

This schema inherits all the rules from the base contract and adds a specific validation rule for `pdf_options.format`, ensuring it can only be one of the two specified values. This demonstrates how plugins can build upon the common foundation to create more specialized and robust configurations.

