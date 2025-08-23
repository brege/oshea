---
cli_help: >
  Plugin: valid-collection-plugin-2

  Description: A new valid-collection-plugin-2 plugin for [describe your
  plugin's purpose here].


  Features:
    - Basic Markdown to PDF conversion.
    - Uses DefaultHandler for standard processing.
    - Customizable via its own .config.yaml and .css files.

  Expected Front Matter:
    - title: (string) Document title. Used for PDF metadata and often as the main H1 heading.
    - author: (string, optional) Document author.
    - date: (string or date, optional) Document date.
    - (Add any other front matter fields your 'valid-collection-plugin-2' plugin will specifically use)

  Configuration Notes (valid-collection-plugin-2.config.yaml):
    - css_files: Points to "valid-collection-plugin-2.css". Modify this file for custom styling.
    - pdf_options: Adjust page size, margins, etc., as needed.
    - inject_fm_title_as_h1: Set to true if you want the 'title' from front matter to be the main H1.
    - math: Configure KaTeX math rendering if required.

  Example Usage (after registration):
    oshea convert my_document.md --plugin valid-collection-plugin-2
---

# `valid-collection-plugin-2` Plugin Template

This is a basic template for creating new `oshea` plugins. It provides a starting point for common document conversion needs.

## About This Template

* **Functionality**

  By default, this `valid-collection-plugin-2` plugin uses the `DefaultHandler` from `oshea`'s core utilities. This means it will process standard Markdown, apply styling from `valid-collection-plugin-2.css`, and use PDF generation options defined in `valid-collection-plugin-2.config.yaml`.

* **Customization**

  You are encouraged to modify:
    * `valid-collection-plugin-2.config.yaml`: Adjust `description`, `pdf_options`, `css_files`, `math` settings, `params`, etc.
    * `valid-collection-plugin-2.css`: Add your custom CSS rules to style your documents.
    * `index.js`: For more advanced behavior, you can modify the `ValidCollectionPlugin2Handler` class to implement custom logic, such as unique data processing or HTML generation, instead of just relying on `DefaultHandler`.
    * This `README.md`: Update the `cli_help` section above and the main content here to accurately describe your new plugin.

## Getting Started After Creation

1. **Understand the Files**

   * `valid-collection-plugin-2.config.yaml`: Main configuration for your plugin.
   * `index.js`: The Node.js handler script.
   * `valid-collection-plugin-2.css`: Stylesheet for your plugin.
   * `README.md`: This file – your plugin's documentation.
   * `valid-collection-plugin-2-example.md`: An example Markdown file.

2. **Test the Example (Out-of-the-Box)** 
    
   The generated `valid-collection-plugin-2-example.md` is pre-configured to use your new plugin directly. Navigate into your new plugin's directory and run:
   ```bash
   oshea valid-collection-plugin-2-example.md
   ```
   This works because the example Markdown file's front matter contains `oshea_plugin: "./valid-collection-plugin-2.config.yaml"`, which explicitly tells `oshea` to use the sibling configuration file for that specific conversion.

3. **Customize**

   * Update the `description` in `valid-collection-plugin-2.config.yaml`.
   * Modify `valid-collection-plugin-2.css` with your desired styles.
   * If needed, enhance `index.js` with custom processing logic.
   * Fill out the `cli_help` section and the rest of this `README.md`.

4. **Register Your Plugin (For General Use)**

   To use your `valid-collection-plugin-2` plugin with *any* Markdown file by its name (e.g., `oshea convert another.md --plugin valid-collection-plugin-2`), you need to register it in a main `oshea` configuration file (e.g., your user-level `~/.config/oshea/config.yaml` or a project-specific `config.yaml`). Add an entry like this:

   ```yaml
   # In your main config.yaml
   plugins:
     # ... other plugins ...
     valid-collection-plugin-2: "/full/path/to/your/valid-collection-plugin-2/valid-collection-plugin-2.config.yaml"
     # Or, if using plugin_directory_aliases:
     # my_plugins_alias: "/full/path/to/your/plugins_base_dir/"
     # valid-collection-plugin-2: "my_plugins_alias:valid-collection-plugin-2/valid-collection-plugin-2.config.yaml"
   ```

5. **Use Your Plugin Generally**

   Once registered, you can invoke it by name from any directory:
   ```bash
   oshea convert path/to/any_document.md --plugin valid-collection-plugin-2
   ```

---

**Note:** This is an archetype of the "/path/to/oshea/plugins/valid-collection-plugin-2" plugin, created as "valid-collection-plugin-2". You may need to update its content, registration paths, and internal references if you customize it further.

**Note:** This is an archetype of the './/oshea/plugins/template-basic' plugin, created as 'valid-collection-plugin-2'. You may need to update its content, registration paths, and internal references if you customize it further.
