# md-to-pdf: Markdown to PDF Converter 

A Node.js command-line tool that converts Markdown files into styled PDFs. It uses an extensible document type plugin system, making it suitable for CVs, cover letters, recipes, recipe books, and batch exporting Hugo content. The tool uses `markdown-it` for Markdown parsing and Puppeteer (headless Chromium) for PDF generation.

## Features

* **Extensible Plugin System** Define new document types with custom processing, configurations (local `*.config.yaml`), CSS, and data structures. Existing types are implemented as **plugins**:
  
  - [`default`](plugins/default)
  - [`cv`](plugins/cv)
  - [`cover-letter`](cover-letter)
  - [`recipe`](recipe)
  - [`recipe-book`](plugins/recipe-book)

  And a batch export **extension**:

  - [`hugo-export-each`](plugins/hugo-export-each)

* **Versatility**
  * **Singletons**: Convert single Markdown files to PDF using type-specific plugins.
  * **Collections**: Generate combined PDF recipe books with optional covers and tables of contents.
  * **Batch Export**: Batch export individual PDFs from Hugo content directories with specific naming and styling.

* **Configurability**
  * A main `config.yaml` for global settings and plugin registration.
  * Each plugin manages its own local configuration for PDF options, CSS, and behavior.
  * YAML front matter in Markdown files for metadata and dynamic content substitution.
  * A `--config` flag for project-specific settings, allowing manifestation of stylistic profiles.

* **Watch Mode**
  * Use the `--watch` flag with `convert` and `generate` commands to automatically re-generate PDFs when source Markdown, plugin configurations, or plugin CSS files are modified.

### Examples

| [CV Layout](plugins/cv)                                       | [Cover Letter Layout](plugins/cover-letter)                           | [Recipe Layout](plugins/recipe)                        |
| :-----------------------------------: | :----------------------------------: | :---------------------------------: |
| <img src="examples/screenshots/example-cv.png" alt="CV Layout Screenshot" width="300"/> | <img src="examples/screenshots/example-cover-letter.png" alt="Cover Letter Screenshot" width="300"/> | <img src="examples/screenshots/example-recipe.png" alt="Recipe Sreenshot" width="300"/> |



## Prerequisites

* **Node.js:** Version 18.0.0 or higher is recommended. Download from [nodejs.org](https://nodejs.org/).
* **npm (Node Package Manager):** Usually included with Node.js.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/brege/md-to-pdf.git
    cd md-to-pdf
    ```

2.  **Install dependencies:**
    
    ```bash
    npm install
    ```
    This installs required packages and downloads a standalone version of Chromium (for [Puppeteer](https://pptr.dev/) to render intermediate HTML to PDF), and [Chokidar](https://github.com/paulmillr/chokidar) for auto-refreshing your PDF viewer (evince, Firefox, etc).

3.  **Initialize Configuration:**
    ```bash
    cp config.example.yaml config.yaml
    ```
    This file primarily handles global settings (like `pdf_viewer`) and registers available document type plugins. Detailed plugin configurations are in their respective directories (e.g., [`plugins/cv/cv.config.yaml`](plugins/cv/cv.config.yaml)). See [Plugin Archetypes](#plugin-archetype).

4.  **(Optional) Make the CLI globally available:**
    To run `md-to-pdf` from any directory:
    ```bash
    npm link
    ```
    (You might need `sudo` depending on your npm setup. Alternatively, run from the project root using `node ./cli.js ...`.)

## Usage

The primary interface is [`cli.js`](cli.js). If globally linked, use `md-to-pdf`. Otherwise, from the project root, use `node ./cli.js`.

**Global Option:**

* `--config <path_to_config.yaml>`: Specify a custom path to your main YAML configuration file. Defaults to `config.yaml` in the project root.

    Example: `md-to-pdf convert examples/example-cv.md --plugin cv --config my-custom-settings.yaml`

### Commands

There are three main command types:

  - **Type 1 -- Singletons**: Converting single Markdown files to PDFs.
  
  - **Type 2 -- Collections**: Generate combined PDF (recipe books) from multiple Markdown files, supporting covers and tables of contents.
  
  - **Type 3 -- Batch Export**: Batch export individual PDFs from Hugo content directories.

### Type 1 -- Singletons: `convert <markdownFile> --plugin <pluginName>`

  Converts a single Markdown file to PDF using the specified document type plugin.

  **Syntax:**
  ```bash
  md-to-pdf convert <markdownFile> --plugin <pluginName> [options]
  ```

**Arguments & Options:**

```text
<markdownFile>                  Required, Path to the input Markdown file
-p, --plugin <pluginName>       Required, but defaults to plugins/default
-o, --outdir <directory>        Output directory for the PDF. Defaults to the input file's directory.
-f, --filename <name.pdf>       Specify the exact output PDF filename
--no-open                       Prevents automatically opening the generated PDF.
-w, --watch                     Enable watch mode to automatically rebuild on file changes.
```

**Examples:**

  * Convert a CV using the [`cv`](plugins/cv) plugin and watch for changes:

    ```bash
    md-to-pdf convert examples/example-cv.md --plugin cv --watch
    ```

  * Convert a recipe, specifying output:
  
    ```bash
    md-to-pdf convert examples/example-recipe.md \
        --plugin recipe \
        --outdir ./output_pdfs \
        --filename my-dish.pdf
    ```

### Type 2 -- Collections: `generate <pluginName> [plugin-specific-options...]`

Generates a document using a specified plugin. This command is suitable for plugins that might not take a single Markdown file as primary input (like [`recipe-book`](plugins/recipe-book)) or require more complex arguments.

**Syntax:**

```bash
md-to-pdf generate <pluginName> \
    [options_for_the_plugin...] \
    --outdir <directory> \
    --filename <name.pdf>
```

**Arguments & Options:**

```text
<pluginName>                    Required, Name of the plugin to use
[plugin-specific-options...]    Additional options required by the specific plugin
    --recipes-base-dir <path>   Required for recipe-book, Path to the directory containing recipe Markdown files
-o, --outdir <directory>        Output directory. Defaults to the current directory.
-f, --filename <name.pdf>       Specific output PDF name.
--no-open                       Prevents auto-opening.
-w, --watch                     Enable watch mode.
```

**Example (Recipe Book):**
The `recipe-book` plugin is invoked using the `generate` command:

```bash
md-to-pdf generate recipe-book \
  --recipes-base-dir examples/hugo-example \
  --outdir ./my_cookbooks \
  --filename "Family Cookbook.pdf" \
  --watch
```

### Type 3 -- Batch Export: `hugo-export-each <sourceDir> --base-plugin <pluginName>`

  Batch exports individual PDFs from a Hugo content directory. Each item is processed using the specified base plugin for styling. PDFs are saved alongside their source Markdown files. *(Watch mode is not currently supported for this command).*

**Syntax:**

```bash
md-to-pdf hugo-export-each <sourceDir> --base-plugin <pluginName> [options]
```

**Arguments & Options:**

```text
<sourceDir>                   Required, Path to the source directory containing Hugo content items
--base-plugin <pluginName>    Required, defaults to `recipe` or as configured
--hugo-ruleset <rulesetName>  The key in `config.yaml` under `hugo_export_each` for specific processing rules
--no-open                     Prevents auto-opening (default is `true` for this batch command)
```

**Example:**

```bash
md-to-pdf hugo-export-each examples/hugo-example --base-plugin recipe
```

## Configuration

Configuration is managed via a main `config.yaml` and individual plugin configurations located within a [`plugins/`](plugins/) directory (by convention).

### Main `config.yaml`

Located at the project root (or specified by `--config`), this file handles global settings and plugin registration. Here's an illustrative structure:

```yaml
# config.yaml (Main Application Configuration)

# --- Global Settings ---
pdf_viewer: "firefox" # Or null, "xdg-open", "open -a Preview", etc.

global_pdf_options:
  format: "Letter"
  printBackground: true
  margin:
    top: "1in"
    right: "1in"
    bottom: "1in"
    left: "1in"
  # displayHeaderFooter: true
  # headerTemplate: "<div>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>"
  # footerTemplate: "<div>{{ .title }}</div>"

global_remove_shortcodes:
  - "" # Removes HTML comments # - "{{% .* %}}" # Example: Remove a class of shortcodes

# --- Document Type Plugin Registrations ---
# Maps a plugin name (used with CLI commands) to the path of its
# specific configuration file. Paths are relative to this main config file.
document_type_plugins:
  default: "plugins/default/default.config.yaml"
  cv: "plugins/cv/cv.config.yaml"
  recipe: "plugins/recipe/recipe.config.yaml"
  "recipe-book": "plugins/recipe-book/recipe-book.config.yaml" # Quoting needed if key has special chars
  "cover-letter": "plugins/cover-letter/cover-letter.config.yaml"
  # menu: "path/to/your/custom_plugins/menu/menu.config.yaml"
  # "business-card": "plugins/business-card/business-card.config.yaml"
```

Configuration for the [`hugo-export-each`](plugins/hugo-export-each) command, including rulesets for author extraction and Hugo-specific shortcode removal, is a top-level extension.

### Configuration Lookup Order

From lowest precedence (1) to highest (3):

1.  **Pre-configured (Lowest):**

    The main files in this repository, `config.yaml` and:
    - [`plugins/<pluginName>/<pluginName>.config.yaml`](plugins/),
    - [`plugins/<pluginName>/<pluginName>.css`](plugins/)

2.  **XDG User Defaults (Optional):**

    Customize plugins globally by creating a similar structure in your XDG config directory:
    
    - **`~/.config/md-to-pdf/`**

    These override pre-configured defaults, making this method useful for personalization, globally.

    *Example XDG Structure:*
    ```
    ~/.config/md-to-pdf/
    ├── config.yaml                   # For global settings (e.g., 'pdf_viewer')
    ├── cv/
    │   ├── cv.config.yaml            # CV-specific overrides
    │   └── cv.css                    # Custom default CV styles
    └── cover-letter/
        ├── cover-letter.config.yaml  # Cover letter-specific overrides
        └── cover-letter.css          # Custom default cover letter styles
    ```

    In `~/.config/md-to-pdf/cv/cv.config.yaml`, you can redefine `pdf_options`, customize `css_files`, etc.


3.  **Project-Specific Overrides via `--config` (Highest):**

    Use 

    - **`--config /path/to/your_project_main.yaml`**

    for project-specific settings. This `your_project_main.yaml` acts as a manifest, pointing to other YAML files within your project that detail plugin configurations for that project.

    *Example Project Structure with different CV styles:*

    ```
    my_cvs/
    ├── academic-cv/
    │   ├── main.academic.yaml          # This is passed to --config
    │   ├── cv.academic.config.yaml
    │   └── cv.academic.css
    └── data-science-cv/
        ├── main.datasci.yaml           # This is passed to --config
        ├── cv.datasci.config.yaml
        └── cv.datasci.css
    ```

    *Example `my_cvs/academic-cv/main.academic.yaml`:*

    ```yaml
    document_type_plugins:
      cv: "./cv.academic.config.yaml"   # Relative to main.academic.yaml, or absolute
    ```

    *CLI Call:*

    ```bash
    md-to-pdf convert my_academic_cv.md \
        --plugin cv \
        --config my_cvs/academic-cv/main.academic.yaml

    md-to-pdf convert my_data_science_cv.md ...
    ```

**CSS Merging with `inherit_css`:**

  * `inherit_css: true` - Appends this layer's CSS files to those from lower layers.
  * `inherit_css: false` - Replaces all lower-layer CSS files (and [`default.css`](plugins/default/default.css)) with those from this layer.


## Front Matter and Placeholders

Markdown files can include YAML front matter for metadata and to enable dynamic content substitution.

**Example Front Matter:**

```yaml
---
title: "My Document Title"
author: "Author Name"
date: "{{ .CurrentDateISO }}" # Uses a dynamic date placeholder
custom_data:
  key: "Some value"
---

Content with {{ .custom_data.key }} and today's date: {{ .CurrentDateFormatted }}.
```

**Dynamic Placeholders:**

  * **Syntax:** `{{ .key }}` or `{{ .path.to.key }}` (e.g., `{{ .custom_data.key }}`). The `.` refers to the root of the data context (processed front matter).
  
  * **Automatic Date Placeholders:**
      * `{{ .CurrentDateFormatted }}`: Current date, long format (e.g., "May 19, 2025").
      * `{{ .CurrentDateISO }}`: Current date, `YYYY-MM-DD` format.

## Plugin Archetypes

To extend `md-to-pdf` with a new document type (e.g., "businesscard"):

1. **Directory Structure:** Create `plugins/businesscard/` containing:

    ```bash
    plugins/
    └── business-card/
        ├── business-card.config.yaml  # Configuration shown above
        ├── index.js                   # The handler_script (Node.js module)
        ├── business-card-styles.css   # CSS file(s)
        ├── data/                      # Optional: For YAML/JSON data files
        │   └── contacts.yaml
        └── templates/                 # Optional: For HTML/Markdown template snippets
            └── card-layout.html
    ```

2. **Registration:** Add your plugin to the `document_type_plugins` section in your main `config.yaml`:

    ```yaml
    document_type_plugins:
      # ... other plugins ...
      businesscard: "plugins/businesscard/businesscard.config.yaml"
    ```

3. **Configuration:** Edit the `businesscard.config.yaml` file with the desired configuration.

    ```yaml
    # Example: plugins/business-card/business-card.config.yaml

    description: "Generates printable business cards with precise dimensions."
    handler_script: "index.js" # relative to plugins/business-card/

    css_files:
    - "business-card-styles.css" # relative to plugins/business-card/

    pdf_options: # This plugin's PDF settings
    width: "3.5in"
    height: "2in"
    # Margins are often set to zero for trim-size outputs;
    margin: { top: "0in", bottom: "0in", left: "0in", right: "0in" }
    printBackground: true

    toc_options: { enabled: false } # Unlikely for business cards
    cover_page_options: { enabled: false } # Unlikely for business cards

    remove_shortcodes_patterns: [] 

    processing_flags:
    inject_fm_title_as_h1: false

    custom_settings:
    default_template: "modern-compact" # e.g., to select a layout defined in CSS/handler
    # data_input_method: "frontmatter_list" # Hint for the handler
    ```

For a practical understanding, examining the refactored plugins like [`plugins/cv/`](plugins/cv/) or the base [`plugins/default/`](plugins/default/) will be helpful. Adding corresponding test cases in [`test/run-tests.js`](test/run-tests.js) is also a good practice.

## Testing

The project includes an integration test suite.

```bash
npm test
```

Test scripts and configurations are in [`test/`](test/), and [`test/config.test.yaml`](test/config.test.yaml), which should reflect the plugin structure.

For more details, see [`test/README.md`](test#readme).

## License

This project is licensed under the [MIT License](LICENSE).

