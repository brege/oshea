# Understanding and Using `md-to-pdf` Bundled Plugins

This directory serves as the home for the core, bundled plugins that come pre-packaged with `md-to-pdf`. It also functions as a **reference example** for how other external plugin collections can be structured and documented.

These plugins provide out-of-the-box functionality for various document types, demonstrating the power and flexibility of the `md-to-pdf` plugin system.

## Bundled Plugins Overview:

Here's a list of the plugins included in this bundled collection:

* [**`cv/`**](cv/): Specifically designed for generating professional Curriculum Vitae (CV) documents.
* [**`cover-letter/`**](cover-letter/): Tailored for creating formatted cover letters.
* [**`default/`**](default/): A versatile, generic plugin for converting standard Markdown documents to PDF.
* [**`recipe/`**](recipe/): Optimized for formatting individual recipe documents.
* [**`recipe-book/`**](recipe-book/): A specialized plugin for compiling multiple recipes into a single, cohesive recipe book, typically invoked using the `generate` command.
* [**`template-basic/`**](template-basic/): A minimal template plugin, useful as a starting point for creating new plugins via archetyping.

## How to Manage and Use These Plugins

These plugins are automatically available when you install `md-to-pdf`. For external plugin collections, you would typically use the `md-to-pdf collection add` command.

### Discovering and Getting Help for Plugins

You can easily explore these bundled plugins and any other registered plugins directly from your command line:

* **List All Available Plugins:**
    ```bash
    md-to-pdf plugin list
    ```
    This command will show all plugins that `md-to-pdf` can find, including those from this bundled collection, any user-added collections, and individual plugins.

* **Get Detailed Plugin Help:**
    ```bash
    md-to-pdf plugin help <pluginName>
    ```
    Replace `<pluginName>` with the name of any plugin (e.g., `cv`, `recipe-book`). This command will display detailed information about the plugin's features, expected front matter, and configuration notes.

### Converting Documents with Plugins

Once you know the plugin name, you can use it with the `convert` or `generate` commands:

* **Single File Conversion (`convert`):**
    ```bash
    md-to-pdf convert <markdownFile> --plugin <pluginName> [options]
    ```
    *Example: Convert a CV*
    ```bash
    md-to-pdf convert my_cv.md --plugin cv --outdir ./output
    ```

* **Complex Document Generation (`generate`):**
    Some plugins, like `recipe-book`, are designed to generate documents from multiple sources or require specific arguments.
    ```bash
    md-to-pdf generate <pluginName> [plugin-specific-options...] [options]
    ```
    *Example: Generate a Recipe Book*
    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir ./all_my_recipes --filename "MyCookbook.pdf"
    ```

For a comprehensive list of all `md-to-pdf` commands, their options, and quick syntax, please refer to the main [Cheat Sheet](../docs/cheat-sheet.md).

## Customizing Bundled Plugins

You can change the styles (CSS) and PDF settings (page size, margins, etc.) of these bundled plugins without altering their original files. This is done using `md-to-pdf`'s flexible configuration system.

**For full details on how to customize plugin settings, please see the [Plugin Development Guide](../docs/plugin-development.md).**

## Creating Your Own Plugins and Collections

Want to create a plugin for a document type not covered here, or build your own collection of plugins? `md-to-pdf` is designed for extensibility!

**For a comprehensive guide on building your own plugins from scratch (including directory structure, handler scripts, and registration), please refer to the [Plugin Development Guide](../docs/plugin-development.md).**
