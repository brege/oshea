# Understanding and Using `md-to-pdf` Plugins

This directory contains the core, bundled plugins that come with `md-to-pdf`.
These plugins provide out-of-the-box functionality for various document types.

## Bundled Plugins Overview:

* [**`cv/`**](cv/): For Curriculum Vitae documents. 
* [**`cover-letter/`**](cover-letter/): For cover letters. 
* [**`default/`**](default/): A generic plugin for standard Markdown documents.
* [**`recipe/`**'](recipe/): For individual recipe documents.
* [**`recipe-book/`**](recipe-book/): For compiling multiple recipes into a single book. This plugin is typically invoked using the `generate` command.

## How Plugins are Used with `md-to-pdf` Commands

`md-to-pdf` uses a command-driven approach to leverage these plugins. Here's a brief overview of the main commands and how they relate to plugins. For a comprehensive list of all options and quick syntax, please refer to the [Cheat Sheet](../docs/cheat-sheet.md).

### Single File Conversion: `convert`

The `convert` command is used for transforming a single Markdown file into a PDF using a specified plugin.

*Basic Syntax:*
```bash
md-to-pdf convert <markdownFile> --plugin <pluginName> [options]
```

  * `<markdownFile>`: Path to your Markdown source.
  * `--plugin <pluginName>`: Specifies which plugin's configuration and styling to use (e.g., `cv`, `recipe`, `default`).
  * Common options include `--outdir`, `--filename`, `--watch`.

*Example:*

```bash
md-to-pdf convert my_cv.md --plugin cv --outdir ./output
```

### Complex Document Generation: `generate`

The `generate` command is used for plugins that might have more complex input requirements or produce documents from multiple sources, like the `recipe-book` plugin.

*Basic Syntax:*

```bash
md-to-pdf generate <pluginName> [plugin-specific-options...] [options]
```

  * `<pluginName>`: The name of the generator plugin (e.g., `recipe-book`).
  * `[plugin-specific-options...]`: Arguments required by the plugin itself (e.g., `--recipes-base-dir` for `recipe-book`).

*Example (Recipe Book):*

```bash
md-to-pdf generate recipe-book --recipes-base-dir ./all_my_recipes --filename "MyCookbook.pdf"
```

### Batch Processing: `hugo-export-each`

This command is specialized for processing multiple Markdown files from a Hugo content structure, applying a base plugin for consistent styling.

*Basic Syntax:*

```bash
md-to-pdf hugo-export-each <sourceDir> --base-plugin <pluginName> [options]
```

*Example:*

```bash
md-to-pdf hugo-export-each ./hugo_site/content/posts --base-plugin recipe
```

### Managing Plugins: `plugin` subcommands

  * `md-to-pdf plugin list`: Shows all available plugins that `md-to-pdf` can find.
  * `md-to-pdf plugin create <name>`: Helps you start a new plugin by creating a basic file structure.

## Customizing Bundled Plugins

You can change the styles (CSS) and PDF settings (page size, margins, etc.) of these bundled plugins without altering these original files. This is done using the 3-tier configuration system (XDG user configs or project-specific configs).

**For full details on how to customize plugin settings, please see the "Configuration" section in the main [README](../README.md).**

## Creating Your Own Plugins

Want to create a plugin for a document type not covered here? `md-to-pdf` is extensible\!

**For a comprehensive guide on building your own plugins from scratch (including directory structure, handler scripts, and registration), please refer to the [Plugin Development Guide](../docs/plugin-development.md).**

