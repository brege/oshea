# Plugin Development Guide - md-to-pdf

This document serves as a reference for creating and managing custom plugins for the `md-to-pdf` tool. For general usage, basic configuration, and quick examples, please refer to the main [README.md](../README.md) and the [cheat-sheet.md](cheat-sheet.md).

## Plugin Anatomy

A plugin for `md-to-pdf` is a self-contained directory that bundles configuration, styling, and logic for processing a specific type of Markdown document.

### Core Directory Structure

Typically, a plugin resides in its own directory. For example, a plugin named `my-invoice` would be structured as:

    my-custom-plugins/
    └── my-invoice/
        ├── my-invoice.config.yaml  # Primary configuration (manifest)
        ├── index.js                # Node.js handler script
        └── my-invoice.css          # Custom CSS styles

### 1. Plugin Configuration (`<plugin-name>.config.yaml`)

This YAML file is the manifest for your plugin. It defines its properties and behavior.

**Key Fields:**

* `description` (string): A brief description of the plugin.

    Example:

        "Plugin for generating professional invoices."

* `handler_script` (string): The path to the Node.js handler script, relative to this configuration file.
    
    Example:

        "index.js"

* `css_files` (array of strings): A list of CSS files to be applied. Paths are relative to this configuration file.
    
    Example:

        ["my-invoice.css", "theme-print.css"]

* `pdf_options` (object): Puppeteer PDF generation options specific to this plugin. These can override global settings.
    
    Example:

        pdf_options:
          format: "A4"
          margin: { top: "2cm", bottom: "2cm", left: "1.5cm", right: "1.5cm" }
          printBackground: true

* `math` (object, optional): Configuration for KaTeX math rendering.
    * `enabled` (boolean): `true` to enable, `false` (default for new plugins) to disable.
    * `engine` (string): Currently only `"katex"` is supported.
    * `katex_options` (object): KaTeX specific options (see KaTeX documentation).
        
        Example:

            math: # Corrected from katex_options to math as top-level key
              enabled: true
              katex_options:
                throwOnError: false
                trust: false # Recommended for security
                macros: { "\\RR": "\\mathbb{R}" }

* `toc_options` (object, optional): Configuration for Table of Contents generation.
    
    Example:

        toc_options:
          enabled: true
          placeholder: "%%TOC%%" # Marker in Markdown for ToC insertion
          level: [1, 2, 3]       # Heading levels to include
          listType: "ul"         # 'ul' or 'ol'

* `inject_fm_title_as_h1` (boolean, optional): If `true`, uses the `title` from front matter as the main H1 heading of the document. Default is often `true` for simple document plugins. For handlers that generate custom HTML, this should typically be `false`.

* `aggressiveHeadingCleanup` (boolean, optional): If `true`, attempts to remove existing H1/H2 headings from the Markdown content, useful if `inject_fm_title_as_h1` is also true to prevent duplicate titles. Often `false` for custom HTML handlers.

* `watch_sources` (array of objects, optional): Defines additional files or directories for `md-to-pdf` to monitor in `--watch` mode.
    
    Example:

        watch_sources:
          - type: "file" # Watch a single file
            path: "data/invoice-data.json" # Relative to this plugin's config file
          - type: "directory" # Watch a directory
            path_from_cli_arg: "customerDataDir" # Path comes from a CLI argument
          - type: "glob" # Watch using a glob pattern
            base_path_from_cli_arg: "projectRoot" # Base for the glob pattern
            pattern: "templates/**/*.hbs"

### 2. Handler Script (`index.js`)

The handler script is a Node.js module responsible for processing the input data and generating the HTML content that will be converted to PDF.

**Interface:**

The script must export a class. This class should have:
1.  A `constructor(coreUtils)`: Receives an object containing core `md-to-pdf` utilities.
2.  An asynchronous `generate(...)` method.

**`coreUtils` Object:**

The `constructor` receives an object with the following utilities, injected by `PluginManager.js`:

| Utility         | Description                                                                                                                                |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `DefaultHandler`  | The standard handler class. Useful for plugins that need common Markdown-to-HTML processing but with custom configurations or minor tweaks. |
| `markdownUtils` | An object with helper functions like `extractFrontMatter()`, `renderMarkdownToHtml()`, `substituteAllPlaceholders()`, and `generateSlug()`.      |
| `pdfGenerator`  | An object with the `generatePdf()` function for direct PDF creation from an HTML string, CSS, and PDF options.                             |

**`generate` Method Signature and Parameters:**

The `generate` method is the core of your plugin's logic. It must have the following signature:

```javascript
async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath)
````

Here's a breakdown of its parameters:

| Parameter           | Type             | Description                                                                                                                                                              |
|---------------------|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `data`              | `object`         | Input data for the plugin. For `convert` commands, this usually contains `{ markdownFilePath: 'path/to/file.md' }`. For `generate` commands, it often contains `{ cliArgs: {...} }` with arguments passed after the plugin name. |
| `pluginSpecificConfig` | `object`         | The fully resolved configuration object specifically for this plugin instance. This includes settings from the plugin's own `<plugin-name>.config.yaml` merged with any applicable XDG or project-level overrides. |
| `globalConfig`      | `object`         | The main global configuration object loaded by `md-to-pdf` (e.g., from `config.yaml` in the project root, XDG directory, or specified via `--config`). This object includes global `params` and `global_pdf_options`. |
| `outputDir`         | `string`         | The absolute path to the directory where the output PDF file should be saved.                                                                                              |
| `outputFilenameOpt` | `string` (opt)   | The desired filename for the PDF (e.g., "my-document.pdf"), if specified by the user via the `--filename` option. If not provided, the plugin should generate a suitable name. |
| `pluginBasePath`    | `string`         | The absolute path to the root directory of the plugin (i.e., the directory containing its `<plugin-name>.config.yaml`). This is crucial for resolving relative paths to assets like CSS files or templates within the plugin. |
| **Returns** | `Promise<string>` | The method must return a Promise that resolves to a string containing the absolute path to the generated PDF file.                                                       |

**Example: Simple Handler using `DefaultHandler`**

This is suitable for plugins that largely follow standard Markdown processing but need specific CSS, PDF options, or minor pre/post processing.

```javascript
// my-invoice/index.js
class MyInvoiceHandler {
    constructor(coreUtils) {
        // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
        this.handler = new coreUtils.DefaultHandler();
        // Store other utils if needed:
        // this.markdownUtils = coreUtils.markdownUtils;
        // this.pdfGenerator = coreUtils.pdfGenerator;
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        // You can add custom logic before or after calling the DefaultHandler,
        // or implement entirely custom HTML generation.
        console.log(`INFO (MyInvoiceHandler): Processing invoice with plugin config: ${pluginSpecificConfig.description}`);

        // Example: Modify data or config before passing to DefaultHandler
        // const modifiedData = { ...data, extraInfo: "Important Note" };
        // const modifiedPluginConfig = { ...pluginSpecificConfig, customFlag: true };

        return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}
module.exports = MyInvoiceHandler;
```

### 3\. CSS Files

Standard CSS files used to style your document. Paths are specified in your plugin's `css_files` array and are resolved relative to the plugin's `<plugin-name>.config.yaml`.

### Optional Directories

  * `data/`: For storing static data files (e.g., JSON, YAML) that your plugin might use.
  * `templates/`: If your plugin uses a templating engine (like Handlebars, EJS) for HTML generation, you can store template files here.

## Plugin Discovery and Registration

For `md-to-pdf` to recognize and use your custom plugin, it must be "registered." Registration involves telling `md-to-pdf` the name you want to use to invoke your plugin and where to find its main configuration file (`<plugin-name>.config.yaml`).

This is done by adding an entry to the `document_type_plugins` section of a main `config.yaml` file.

**Registration Locations:**

1.  **XDG User-Global Plugins (`~/.config/md-to-pdf/config.yaml`):**
    Plugins registered here are available for your user across all projects.
    Create or edit `~/.config/md-to-pdf/config.yaml`:

    ```yaml
    # ~/.config/md-to-pdf/config.yaml
    document_type_plugins:
      # cli-name-for-plugin: "/path/to/your/plugin/directory/plugin.config.yaml"
      my-invoice: "~/.my_custom_plugins/my-invoice/my-invoice.config.yaml"
      another-plugin: "/opt/shared-md-plugins/another-plugin/another-plugin.config.yaml"
    ```

    Paths can be absolute or use `~` for your home directory.

2.  **Project-Specific Plugins (via `--config your_project_main.yaml`):**
    Plugins registered in a project's main configuration file are only available when that configuration is active (i.e., when using the `--config` flag).
    In your project's main config (e.g., `my_project/project_config.yaml`):

    ```yaml
    # my_project/project_config.yaml
    document_type_plugins:
      # cli-name-for-plugin: "./relative/path/to/plugin/config.yaml"
      project-report: "./md_plugins/project-report/project-report.config.yaml"
      # You can also use absolute paths or tilde paths here
    ```

    Paths are resolved relative to the location of *this* project main config file, but absolute paths or `~` are also supported.

**Plugin Registration Precedence:**
If a plugin name is registered in multiple main configuration files (Bundled, XDG, Project), the Project registration takes precedence, then XDG, then Bundled.

## Configuration Layers & Override Precedence for Custom Plugins

Even for your custom plugins, the 3-tier configuration system of `md-to-pdf` applies. This means the settings defined in your plugin's own `<plugin-name>.config.yaml` can be further customized at the user (XDG) or project level without modifying your plugin's original files.

1.  **Layer 0: Plugin's Own Defaults (Lowest Precedence for Overrides)**
    This is the `<plugin-name>.config.yaml` file within your plugin's directory. It defines the baseline behavior and appearance of your plugin.

2.  **Layer 1: XDG User Overrides (Middle Precedence)**
    A user can create a file at `~/.config/md-to-pdf/<plugin-name>/<plugin-name>.config.yaml` (e.g., `~/.config/md-to-pdf/my-invoice/my-invoice.config.yaml`) to override specific settings from your plugin's Layer 0 config.
    For example, if your `my-invoice.config.yaml` defines A4 paper, a user can create an XDG override to change it to Letter for their personal global preference. CSS files specified here are resolved relative to this XDG override file's directory.

3.  **Layer 2: Project-Specific Overrides (Highest Precedence)**
    If a project's main configuration (passed via `--config`) includes an entry in its `document_type_plugins` that points to another YAML file *specifically to override settings for your plugin*, those settings will take highest precedence.
    For example, in `my_project/project_config.yaml`:

    ```yaml
    document_type_plugins:
      # This tells md-to-pdf to use "my-invoice" plugin, but apply further overrides
      # from the 'clientX_invoice_style.yaml' file for this project.
      # Note: The "my-invoice" plugin itself must have already been registered via
      # its own `<plugin-name>.config.yaml` in an XDG or another project config
      # (or be a bundled one). This entry is for *overriding an existing registration's settings*.
      my-invoice: "./style_overrides/clientX_invoice_style.yaml"
    ```

    Then, `my_project/style_overrides/clientX_invoice_style.yaml` would contain only the settings to change for `my-invoice` within this specific project (e.g., different CSS, different margins). CSS files specified in `clientX_invoice_style.yaml` are resolved relative to *its* directory.

**CSS Merging (`inherit_css`):**
When `css_files` are specified in an override layer (XDG or Project):

  * `inherit_css: true`: Appends CSS files from the current layer to those from lower layers.
  * `inherit_css: false` (default): Replaces all CSS from lower layers with only those from the current layer.

## Using Your Custom Plugin

Once registered, invoke your plugin using the name you defined in the `document_type_plugins` section:

```bash
md-to-pdf convert path/to/document.md --plugin <your-plugin-cli-name>
```

If the plugin is registered in a project-specific configuration, you must include the `--config` flag:

```bash
md-to-pdf convert path/to/document.md --plugin <your-plugin-cli-name> --config path/to/your_project_main.yaml
```

The `--factory-defaults` flag will cause `md-to-pdf` to ignore XDG and Project configurations. This means only bundled plugins (registered in the tool's internal `config.yaml`) would be available, and their settings would not be overridden by XDG/Project layers. Custom plugins registered outside the bundled scope would not be found when this flag is active.

## Getting Started: Scaffolding a New Plugin with `plugin create`

The easiest way to start a new plugin is with the `plugin create` command. This command generates a boilerplate directory structure and essential files for a simple plugin.

**Command Syntax:**

```bash
md-to-pdf plugin create <new-plugin-name> [--dir <target-directory>] [--force]
```

  * `<new-plugin-name>`: The name for your plugin (e.g., `business-card`, `my-report`).
  * `--dir <target-directory>`: (Optional) The directory *within which* your new plugin folder will be created. Defaults to the current working directory.
  * `--force`: (Optional) If the target plugin directory already exists, this flag allows overwriting its contents.

### Example: Creating a "business-card" plugin

<img src="images/screenshots/example-business-card.png" alt="Example Business Card Screenshot" width="500"/>

```bash
md-to-pdf plugin create business-card --dir ./my_custom_plugins
```

This command will create the following structure:

```
./my_custom_plugins/
└── business-card/
    ├── business-card.config.yaml
    ├── index.js
    └── business-card.css
```

**Generated Files:**

  * **`business-card.config.yaml`**: A basic configuration manifest. You'll customize fields like `description`, `pdf_options` (e.g., to set specific dimensions for a business card), etc.

    ```yaml
    # my_plugins/business-card/business-card.config.yaml 
    description: "A new business-card plugin for [purpose]."
    handler_script: "index.js"
    css_files:
      - "business-card.css"
    pdf_options:
      format: "Letter" # You would change this, e.g., width: "3.5in", height: "2in"
      margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" }
    math:
      enabled: false
    ```

  * **`index.js`**: A handler script that uses `DefaultHandler` by default. You can modify this for custom logic.

    ```javascript
    // my_plugins/business-card/index.js 
    class BusinessCardHandler { // Name will be based on your plugin name
        constructor(coreUtils) {
            this.handler = new coreUtils.DefaultHandler();
        }
        async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
            console.log(`INFO (BusinessCardHandler): Processing for plugin '${pluginSpecificConfig.description || 'business-card'}'`);
            return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
        }
    }
    module.exports = BusinessCardHandler;
    ```

  * **`business-card.css`**: A placeholder CSS file for your custom styles.

**Next Steps After Scaffolding:**

1.  **Customize Files**: Edit the generated `.config.yaml`, `index.js` (if needed), and `.css` files to match your plugin's requirements.
2.  **Register**: Add your plugin to a main `config.yaml` as described in the "Plugin Discovery and Registration" section.
3.  **Test**: Use your plugin with the `md-to-pdf convert` or `generate` command.

For a complete, working example of a custom "business-card" plugin, you can also inspect the one used in our test kit located at [`test/custom_plugins/business-card/`](../test/custom_plugins/business-card/).

To compile and view the sample [`example-business-card.md`](../test/assets/example-business-card.md) using the test `business-card` plugin, which is registered in [`test/config.test.yaml`](../test/config.test.yaml)

```bash
md-to-pdf convert test/assets/example-business-card.md --plugin business-card --config test/config.test.yaml --outdir ./test_output
```

Refer to the [cheat-sheet.md](cheat-sheet.md#plugin-management-commands) for more command syntax details.

## Advanced Example: 'advanced-card' Plugin for Custom HTML and Dynamic Content

The standard Markdown-to-HTML conversion offered by `DefaultHandler` leaves a lot to be desired. You might need a highly specific HTML structure, want to integrate dynamic content (like a QR code), or process the Markdown body in a unique way. **This is the where the extendability of the custom plugin handler comes in.**

<img src="images/screenshots/advanced-business-card.png" alt="Advanced Business Card Screenshot" width="500"/>

The **advanced-card** plugin serves as an example of this. It generates a business card where:

  * The main content (name, title, company, contact details) is written directly in the Markdown file's body using standard Markdown syntax (e.g., H1 for name, H2 for title).
  * Front matter is used for auxiliary data like a website URL (for a QR code) or branding colors.
  * A QR code is dynamically generated.
  * The plugin constructs a custom HTML layout and directly calls the PDF generation utility.

**Location:** [`examples/custom_plugin_showcase/advanced-card/`](../examples/custom_plugin_showcase/advanced-card/)

### Why a Custom Handler for "advanced-card"?

* **Precise Layout Control:** Business cards have specific layout requirements that are easier to achieve with custom HTML and CSS than by trying to style generic Markdown output.

* **Dynamic Content Integration:** We want to include a QR code whose data can come from front matter or global parameters.

* **Processing Markdown Body:** Instead of just relying on front matter for all data, this example shows how to take the Markdown content written by the user (e.g., their name as an H1, title as H2) and incorporate that rendered HTML into a custom card structure.

### 1\. Example Markdown (`advanced-card-example.md`)

The user provides card details using standard Markdown formatting.

```markdown
---
# Front matter for auxiliary data
website: "https://www.innovatech.example.com/evance" # Used for QR if qr_data is not set
qr_data: "mailto:e.vance@innovatech.example.com"     # Specific data for the QR code
brandingColor: "#2a9d8f"                             # Custom branding color for top border
---

# Dr. Eleanor Vance
## Lead Research Scientist
### Innovatech Solutions Ltd.

**Email:** e.vance@innovatech.example.com  
**Phone:** +1-555-0102  
**Web:** [innovatech.example.com/evance](https://www.innovatech.example.com/evance)

*Creative Solutions through Scientific Excellence*
```

You could, of course, configure your name, phone number, email, etc in the front matter--or, better yet, in the `params:` portion of your global `config.yaml` file--but for readability we only add dynamic parameters in this example.  E.g., `**Web:** [{{ .website }}]({{ .website }})`.

### 2\. Plugin Configuration (`advanced-card.config.yaml`)

This config defines the card's dimensions and other essential settings.

```yaml
# examples/custom_plugin_showcase/advanced-card/advanced-card.config.yaml
description: "An advanced card plugin demonstrating custom HTML from Markdown body and dynamic content."
handler_script: "index.js"
css_files:
  - "advanced-card.css"

pdf_options:
  width: "3.5in"  # Standard business card width
  height: "2in"   # Standard business card height
  margin:
    top: "0.15in"
    right: "0.15in"
    bottom: "0.15in"
    left: "0.15in"
  printBackground: true # Important for cards that use background colors/images

inject_fm_title_as_h1: false    # H1 comes from Markdown body
aggressiveHeadingCleanup: false
math:
  enabled: false
```

**Key points:**

  * `width` and `height` are set for a typical business card.
  * `margin` is kept small.
  * `printBackground: true` ensures CSS backgrounds are rendered in the PDF.
  * `inject_fm_title_as_h1: false` is crucial because the main heading (the person's name) will come from the H1 tag in the Markdown body.

### 3\. Handler Script (`advanced-card/index.js`) Snippet

The handler reads the Markdown, renders its body to HTML, prepares dynamic data (QR code), and constructs the final HTML for the card.

```javascript
// examples/custom_plugin_showcase/advanced-card/index.js
const fs = require('fs').promises;
const fss = require('fs'); // Synchronous for operations like existsSync
const path = require('path');

class AdvancedCardHandler {
    constructor(coreUtils) {
        this.markdownUtils = coreUtils.markdownUtils;
        this.pdfGenerator = coreUtils.pdfGenerator;
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const { markdownFilePath } = data;
        // ... (error checking for markdownFilePath) ...

        const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
        const { data: fm, content: markdownBody } = this.markdownUtils.extractFrontMatter(rawMarkdownContent);
        const globalParams = globalConfig.params || {};

        // Render the main Markdown body to HTML
        const renderedMarkdownHtml = this.markdownUtils.renderMarkdownToHtml(
            markdownBody,
            pluginSpecificConfig.toc_options,
            (pluginSpecificConfig.pdf_options || {}).anchor_options, // Pass anchor options
            pluginSpecificConfig.math
        );

        // Determine QR code data and URL
        const qrDataSource = fm.qr_data || fm.website || globalParams.defaultWebsite || '[https://example.com](https://example.com)';
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrDataSource)}`;
        const cardBrandingColor = fm.brandingColor || globalParams.defaultBrandingColor || '#333';

        // Construct custom HTML layout, injecting the rendered Markdown
        const htmlBodyContent = `
            <div class="card-container" style="border-top: 5px solid ${cardBrandingColor};">
                <div class="main-content-from-markdown">
                    ${renderedMarkdownHtml}
                </div>
                <div class="qr-code-section">
                    <img src="${qrCodeUrl}" alt="QR Code for ${qrDataSource}">
                </div>
                ${globalParams.companyLogoUrl ? `<img src="${globalParams.companyLogoUrl}" alt="Company Logo" class="company-logo">` : ''}
            </div>
        `;

        const cardNameForFile = fm.name || (markdownBody.split('\n')[0].replace(/^#+\s*/, '')) || 'advanced-card';
        const baseOutputFilename = outputFilenameOpt || `${this.markdownUtils.generateSlug(cardNameForFile)}.pdf`;
        const finalOutputPdfPath = path.join(outputDir, baseOutputFilename);

        // Merge PDF options (plugin's own config should define card dimensions)
        const pdfOptions = { /* ... merge global and plugin-specific pdf_options ... */ };
        if (pdfOptions.width || pdfOptions.height) { delete pdfOptions.format; }


        // Load CSS files
        const cssFileContentsArray = [];
        // ... (logic to load CSS files specified in pluginSpecificConfig.css_files) ...

        // Generate PDF directly
        await this.pdfGenerator.generatePdf(
            htmlBodyContent,
            finalOutputPdfPath,
            pdfOptions,
            cssFileContentsArray
        );
        return finalOutputPdfPath;
    }
}
module.exports = AdvancedCardHandler;
```

**How the handler works:**

  * It uses `this.markdownUtils.extractFrontMatter` and `this.markdownUtils.renderMarkdownToHtml` to process the input.
  * It constructs `htmlBodyContent` by injecting `renderedMarkdownHtml` into a custom `div` structure. This structure also includes a placeholder for the QR code and an optional company logo (from global params).
  * It uses `this.pdfGenerator.generatePdf` to directly render the PDF from this custom HTML string, its own CSS, and specific PDF options.

### 4\. CSS Styling (`advanced-card/advanced-card.css`) Snippet

The CSS targets the custom HTML structure and the standard HTML elements generated from the Markdown body.

```css
/* examples/custom_plugin_showcase/advanced-card/advanced-card.css */
body { /* Styles applied to the Puppeteer page context */
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt; /* Base for card */
    /* ... other body styles ... */
}
.card-container {
    width: 100%; height: 100%;
    padding: 10px;
    position: relative; /* For absolute positioning of QR */
    overflow: hidden;
    /* ... other container styles ... */
}
.main-content-from-markdown {
    line-height: 1.3;
    padding-bottom: 5px; /* To prevent overlap with QR */
}
.main-content-from-markdown h1 { font-size: 14pt; /* ... */ }
.main-content-from-markdown h2 { font-size: 12pt; /* ... */ }
.main-content-from-markdown h3 { font-size: 10pt; /* ... */ }
.main-content-from-markdown p  { font-size: 8pt;  /* ... */ }

.qr-code-section {
    position: absolute;
    bottom: 10px; right: 10px;
    width: 46px; height: 46px;
}
.qr-code-section img { width: 100%; height: 100%; }
/* ... other styles ... */
```

This **advanced-card** example illustrates how to take full control when the standard `DefaultHandler` doesn't meet your needs, allowing for complex layouts, dynamic data, and custom processing of Markdown content.

#### Execution

To compile and view the [`advanced-card-example.md`](../examples/custom_plugin_showcase/advanced-card/advanced-card-example.md) using this **advanced-card** plugin, which should be registered in a main `config.yaml` pointing to

[`examples/custom_plugin_showcase/advanced-card/advanced-card.config.yaml`](../examples/custom_plugin_showcase/advanced-card/advanced-card.config.yaml),

run the following command:

```bash
md_file=examples/custom_plugin_showcase/advanced-card/advanced-card-example.md
md-to-pdf convert $md_file --plugin advanced-card --outdir ./test_output --watch
```
This also highlights the use of the `--watch` flag, which is quite handy when iterating CSS and JavaScript tweaks.

You can find the full source code for this **advanced-card** plugin, including the example Markdown file, in the 

[`examples/custom_plugin_showcase/advanced-card/`](../examples/custom_plugin_showcase/advanced-card/)

directory, which contains
```bash
examples/custom_plugin_showcase/advanced-card/
├── advanced-card.config.yaml   # Plugin configuration
├── advanced-card.css           # Custom CSS
├── advanced-card-example.md    # Example Markdown
└── index.js                    # Plugin handler
```

## Other Advanced Topics

### Using `watch_sources`

If your plugin relies on external data files or templates that should trigger a rebuild in `--watch` mode, define them in the `watch_sources` array in your plugin's `<plugin-name>.config.yaml`. Refer to the example under the "Plugin Configuration (`<plugin-name>.config.yaml`)" section, specifically the "Key Fields" discussion.

### Accessing CLI Arguments in "Generate" Plugins

For plugins invoked with the `generate` command (e.g., `md-to-pdf generate my-data-processor --custom-arg value`), any additional command-line arguments (like `--custom-arg value`) are passed to your plugin's `generate` method within the `data.cliArgs` object:

```javascript
// In your plugin's index.js
async generate(data, pluginSpecificConfig, /* ...other args */) {
    const customArgument = data.cliArgs && data.cliArgs.customArg;
    if (customArgument) {
        console.log("Received custom argument:", customArgument);
    }
    // ... rest of your logic
}
```

