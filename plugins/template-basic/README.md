---
cli_help: |
  Plugin: template-basic
  Description: A new template-basic plugin for [describe your plugin's purpose here].

  Features:
    - Basic Markdown to PDF conversion.
    - Uses DefaultHandler for standard processing.
    - Customizable via its own .config.yaml and .css files.

  Expected Front Matter:
    - title: (string) Document title. Used for PDF metadata and often as the main H1 heading.
    - author: (string, optional) Document author.
    - date: (string or date, optional) Document date.
    - (Add any other front matter fields your 'template-basic' plugin will specifically use)

  Configuration Notes (template-basic.config.yaml):
    - css_files: Points to "template-basic.css". Modify this file for custom styling.
    - pdf_options: Adjust page size, margins, etc., as needed.
    - math: Configure KaTeX math rendering if required.

  Example Usage (after registration):
    oshea convert my_document.md --plugin template-basic
---

# `template-basic` Plugin Template

This is a basic template for creating new `oshea` plugins. It provides a starting point for common document conversion needs.

## About This Template

* **Functionality**

  By default, this `template-basic` plugin uses the `DefaultHandler` from `oshea`'s core utilities. This means it will process standard Markdown, apply styling from `template-basic.css`, and use PDF generation options defined in `template-basic.config.yaml`.

* **Customization**

  You are encouraged to modify:
    * `template-basic.config.yaml`: Adjust `description`, `pdf_options`, `css_files`, `math` settings, etc.
    * `template-basic.css`: Add your custom CSS rules to style your documents.
    * `index.js`: For more advanced behavior, you can modify the `TemplateBasicHandler` class to implement custom logic, such as unique data processing or HTML generation, instead of just relying on `DefaultHandler`.
    * This `README.md`: Update the `cli_help` section above and the main content here to accurately describe your new plugin.

## Getting Started After Creation

1. **Understand the Files**

   * `template-basic.config.yaml`: Main configuration for your plugin.
   * `index.js`: The Node.js handler script.
   * `template-basic.css`: Stylesheet for your plugin.
   * `README.md`: This file – your plugin's documentation.
   * `template-basic-example.md`: An example Markdown file.

2. **Test the Example (Out-of-the-Box)** 
    
   The generated `template-basic-example.md` is pre-configured to use your new plugin directly. Navigate into your new plugin's directory and run:
   ```bash
   oshea template-basic-example.md
   ```
   This works because the example Markdown file's front matter contains `oshea_plugin: "./template-basic.config.yaml"`, which explicitly tells `oshea` to use the sibling configuration file for that specific conversion.

3. **Customize**

   * Update the `description` in `template-basic.config.yaml`.
   * Modify `template-basic.css` with your desired styles.
   * If needed, enhance `index.js` with custom processing logic.
   * Fill out the `cli_help` section and the rest of this `README.md`.

4. **Register Your Plugin (For General Use)**

   To use your `template-basic` plugin with *any* Markdown file by its name (e.g., `oshea convert another.md --plugin template-basic`), you need to register it in a main `oshea` configuration file (e.g., your user-level `~/.config/oshea/config.yaml` or a project-specific `config.yaml`). Add an entry like this:

   ```yaml
   # In your main config.yaml
   plugins:
     # ... other plugins ...
     template-basic: "/full/path/to/your/template-basic/template-basic.config.yaml"
   ```

5. **Use Your Plugin Generally**

   Once registered, you can invoke it by name from any directory:
   ```bash
   oshea convert path/to/any_document.md --plugin template-basic
   ```

---

**Note:** This is an archetype of the "/path/to/oshea/plugins/template-basic" plugin, created as "template-basic". You may need to update its content, registration paths, and internal references if you customize it further.
