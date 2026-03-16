# `template-basic` Plugin Template

This is a basic template for creating new `oshea` plugins. It provides a starting point for common document conversion needs.

## About This Template

* **Functionality**

  By default, this `template-basic` plugin uses the `DefaultHandler` from `oshea`'s core utilities. This means it will process standard Markdown, apply styling from `style.css`, and use PDF generation options defined in `default.yaml`.

* **Customization**

  You are encouraged to modify:
    * `default.yaml`: Adjust `description`, `pdf_options`, `css_files`, `math` settings, etc.
    * `style.css`: Add your custom CSS rules to style your documents.
    * `index.js`: For more advanced behavior, you can modify the `TemplateBasicHandler` class to implement custom logic, such as unique data processing or HTML generation, instead of just relying on `DefaultHandler`.
    * This `README.md`: Update this main content to accurately describe your new plugin.

## Getting Started After Creation

1. **Understand the Files**

   * `default.yaml`: Main configuration for your plugin.
   * `index.js`: The Node.js handler script.
   * `style.css`: Stylesheet for your plugin.
   * `README.md`: This file – your plugin's documentation.
   * `example.md`: An example Markdown file.

2. **Test the Example (Out-of-the-Box)** 
    
   The generated `example.md` is pre-configured to use your new plugin directly. Navigate into your new plugin's directory and run:
   ```bash
   oshea example.md
   ```
   This works because the example Markdown file's front matter contains `oshea_plugin: "./default.yaml"`, which explicitly tells `oshea` to use the sibling configuration file for that specific conversion.

3. **Customize**

   * Update the `description` in `default.yaml`.
   * Modify `style.css` with your desired styles.
   * If needed, enhance `index.js` with custom processing logic.
   * Fill out `cli_help` in `default.yaml` and the rest of this `README.md`.

4. **Register Your Plugin (For General Use)**

   To use your `template-basic` plugin with *any* Markdown file by its name (e.g., `oshea convert another.md --plugin template-basic`), you need to register it in a main `oshea` configuration file (e.g., your user-level `~/.config/oshea/config.yaml` or a project-specific `config.yaml`). Add an entry like this:

   ```yaml
   # In your main config.yaml
   plugins:
     # ... other plugins ...
     template-basic: "/full/path/to/your/template-basic/default.yaml"
   ```

5. **Use Your Plugin Generally**

   Once registered, you can invoke it by name from any directory:
   ```bash
   oshea convert path/to/any_document.md --plugin template-basic
   ```

---

**Note:** This is an archetype of the "/path/to/oshea/plugins/template-basic" plugin, created as "template-basic". You may need to update its content, registration paths, and internal references if you customize it further.
