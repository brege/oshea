# md-to-pdf: Markdown to PDF Converter 

A [Node.js](https://nodejs.org/) command-line tool that converts [Markdown](https://daringfireball.net/projects/markdown/) files into styled PDFs. It uses an extensible document type plugin system, making it suitable for CVs, cover letters, recipes, recipe books, and batch exporting Hugo content. The tool uses [`markdown-it`](https://github.com/markdown-it/markdown-it) for Markdown parsing and [Puppeteer](https://pptr.dev/) (headless Chromium) for PDF generation.

**For a quick reference to commands and common configurations, see the [Cheat Sheet](docs/cheat-sheet.md).**
**To learn about creating your own plugins, refer to the [Plugin Development Guide](docs/plugin-development.md).**
**For future plans, see the [Project Roadmap](docs/roadmap.md).**

## Features

* **Extensible Plugin System**: Define new document types with custom processing, configurations (local `*.config.yaml`), CSS, and handler scripts. Plugins can be bundled with the tool, reside in your user-level XDG configuration directory, or be project-specific. Existing types are implemented as **plugins**:
  
  - [`default`](plugins/default)
  - [`cv`](plugins/cv)
  - [`cover-letter`](plugins/cover-letter)
  - [`recipe`](plugins/recipe)
  - [`recipe-book`](plugins/recipe-book)

  And a batch export **extension**:

  - [`hugo-export-each`](plugins/hugo-export-each) -- This is a command, not a plugin type itself, but uses a base plugin for styling.

* **Versatility**
  * **Singletons**: Convert single Markdown files to PDF using type-specific plugins.
  * **Collections**: Generate combined PDF recipe books with optional covers and tables of contents.
  * **Batch Export**: Batch export individual PDFs from Hugo content directories with specific naming and styling.

* **Configurability**
  * A main `config.yaml` for global settings and **plugin registration**.
  * Each plugin manages its own local configuration for PDF options, CSS, and behavior, which can be overridden.
  * YAML front matter in Markdown files for metadata and dynamic content substitution.
  * A `--config` flag for project-specific settings, allowing manifestation of stylistic profiles and registration of project-local plugins.
  * User-level (XDG) configuration for global defaults and registration of user-specific plugins.
  * For details on how these layers interact, see the Configuration Overview below and the [Plugin Development Guide](docs/plugin-development.md) for advanced scenarios.

* **Watch Mode**
  * Use the `--watch` flag with `convert` and `generate` commands to automatically re-generate PDFs when source Markdown, plugin configurations, or plugin CSS files are modified.

* **[LaTeX](https://en.wikipedia.org/wiki/LaTeX) Math Rendering**: Displays mathematical notation using [KaTeX](https://katex.org/). Inline math is supported with `$...$` and display math with `$$...$$`. Other common LaTeX delimiters like `\(...\)` and `\[...\]` are not currently supported. See [`config.example.yaml`](config.example.yaml) for an example.

### Examples

| [CV Layout](plugins/cv)                                       | [Cover Letter Layout](plugins/cover-letter)                           | [Recipe Layout](plugins/recipe)                        |
| :-----------------------------------: | :----------------------------------: | :---------------------------------: |
| <img src="docs/images/screenshots/example-cv.png" alt="CV Layout Screenshot" width="300"/> | <img src="docs/images/screenshots/example-cover-letter.png" alt="Cover Letter Screenshot" width="300"/> | <img src="docs/images/screenshots/example-recipe.png" alt="Recipe Sreenshot" width="300"/> |


## Prerequisites

* **Node.js:** Version 18.0.0 or higher is recommended. Download from [nodejs.org](https://nodejs.org/).
* **npm (Node Package Manager):** Usually included with Node.js.

```bash
node -v
npm -v
```

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
    This installs required packages and downloads a standalone version of Chromium (for [Puppeteer](https://pptr.dev/) to render intermediate HTML to PDF), and [Chokidar](https://github.com/paulmillr/chokidar) for auto-refreshing your PDF viewer.

3.  **Initialize Configuration (Optional but Recommended):**
    If you intend to customize global settings or add your own user-level plugins, you can copy the example configuration:
    ```bash
    cp config.example.yaml config.yaml
    ```
    This bundled `config.yaml` primarily handles registration of built-in plugins and can be used for global tool settings (like `pdf_viewer`). You can also set up user-level configurations (see [Configuration Lookup Order](#configuration-lookup-order) and the [Plugin Development Guide](docs/plugin-development.md). 

4.  **(Optional) Make the CLI globally available:**
    To run `md-to-pdf` from any directory:
    ```bash
    npm link
    ```
    (You might need `sudo` depending on your npm setup. Alternatively, run from the project root using `node ./cli.js ...`.)

## Usage

The primary interface is [`cli.js`](cli.js). If globally linked, use `md-to-pdf`. Otherwise, from the project root, use `node ./cli.js`.

**Global Options:**

* `--config <path_to_config.yaml>`: Specify a custom path to your main project-specific YAML configuration file. This file can register project-local plugins and override settings.
* `--factory-defaults` (or `--fd`): Use only bundled default configurations and plugins, ignoring user (XDG) and project (`--config`) configurations. Useful for debugging or getting a "vanilla" output.

### Commands Overview

`md-to-pdf` offers several commands for different conversion and generation tasks:

* **`convert`**: For converting single Markdown files to PDF using a specific plugin.
    *Example:*
    ```bash
    md-to-pdf convert my_document.md --plugin cv --outdir ./pdfs
    ```

* **`generate`**: For plugins that require more complex inputs or generate documents from sources other than a single Markdown file (e.g., recipe books).
    *Example (Recipe Book):*
    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir ./my-recipes --filename "FamilyCookbook.pdf"
    ```

* **`hugo-export-each`**: For batch exporting individual PDFs from a Hugo content directory.
    *Example:*
    ```bash
    md-to-pdf hugo-export-each ./my-hugo-site/content/recipes --base-plugin recipe
    ```

* **`plugin`**: A group of subcommands for managing plugins.
    * `plugin list`: Lists all discoverable plugins.
        *Example:*
        ```bash
        md-to-pdf plugin list
        ```
    * `plugin create <pluginName>`: Generates a boilerplate for a new plugin.
        *Example:*
        ```bash
        md-to-pdf plugin create my-invoice --dir ./custom-plugins
        ```

For detailed syntax, all available options, and more examples for each command, please refer to the [Cheat Sheet](docs/cheat-sheet.md#core-commands--common-use-cases).


## Configuration

`md-to-pdf` uses a layered configuration system. This allows you to set global defaults and then override them for your specific user needs (via XDG configuration) or for individual projects (via a project-specific configuration file passed with `--config`).

This section focuses on how to customize **global settings** (like `pdf_viewer`) and the **settings of existing plugins** (like changing CSS or PDF options for the bundled `cv` or `recipe` plugins). For details on creating entirely new plugins from scratch, refer to the [Plugin Development Guide](docs/plugin-development.md)

### Configuration Layers and Precedence

Settings are resolved by looking through up to three layers, with later layers overriding earlier ones:

1.  **Bundled Defaults (Lowest - Factory Settings):**

    If you installed this repository in `~/md-to-pdf/`:

    * **Main Config:** The `~/md-to-pdf/config.yaml` file (at the root of the `md-to-pdf` installation). This file defines default global settings (like `global_pdf_options`) and registers the paths to the standard bundled plugins (e.g., [`cv`](plugins/cv/), [`recipe`](plugins/recipe/) through its `document_type_plugins` section.

    * **Plugin Defaults:** Each bundled plugin ([`plugins/cv/`](plugins/cv) has its own `<pluginName>.config.yaml` ([`cv.config.yaml`](plugins/cv/cv.config.yaml) that defines its default behavior, CSS files, and PDF options.

    Unless you want to maintain a fork of this repository, it is best to use the following methods to edit stylesheets and plugin behavior.

2.  **XDG User Defaults (Optional - Personal Settings):**

    The typical location is `~/.config/md-to-pdf/` on Linux. You should configure personal global defaults here or customize any plugin's behavior for all your projects.
      
    * **Global User Settings:** Create `~/.config/md-to-pdf/config.yaml` to override tool-wide settings like `pdf_viewer` or `global_pdf_options`.

        ```yaml
        # ~/.config/md-to-pdf/config.yaml
        pdf_viewer: "evince" 
        global_pdf_options:
          format: "A4"                              # Your preferred default paper size
        ```
      
    * **Plugin-Specific User Overrides:** To override settings for a specific plugin (e.g., the bundled `cv` plugin), create a directory and file like `~/.config/md-to-pdf/cv/cv.config.yaml`.
        
        ```yaml
        # ~/.config/md-to-pdf/cv/cv.config.yaml
        # Overrides for the 'cv' plugin (e.g., to change its default CSS or margins)
        description: "My custom default CV style."
        css_files: ["./my_personal_cv_style.css"]   # Path relative to this file
        inherit_css: false                          # Use only my CSS
        pdf_options:
          margin: { top: "0.8in", bottom: "0.8in" }
        ```
        Place `my_personal_cv_style.css` in `~/.config/md-to-pdf/cv/`.
      
    This XDG config location **`~/.config/md-to-pdf/config.yaml`** can also be used to register your own custom plugins. See [Plugin Development Guide](docs/plugin-development.md). 

3.  **Project-Specific Configuration (Highest - Project Settings):**

    Use the `--config /path/to/your_project_main.yaml` CLI flag.
  
    * **Project Specific Settings:** The `your_project_main.yaml` file can override any global settings from the Bundled or XDG layers.
      
        ```yaml
        # /path/to/your_project_main.yaml
        pdf_viewer: "firefox"                       # Project-specific viewer
        global_pdf_options:
          format: "Letter" 
        ```

    * **Project Plugin-Specific Overrides:** This `your_project_main.yaml` can also point to other YAML files within your project that provide further overrides for specific plugins.

        ```yaml
        # /path/to/your_project_main.yaml (continued)
        # This 'document_type_plugins' section here can EITHER register new project-local
        #  plugins
        # OR 
        #  point to files that override settings for existing (bundled/XDG) plugins.
        document_type_plugins:
          cv: "./project_cv_overrides.config.yaml"  # Path relative to your_project_main.yaml
        recipe: "./my_project_recipe_style.config.yaml"
        ```
     
    Then, `./project_cv_overrides.config.yaml` would contain only the settings you want to change for the `cv` plugin within this project:
    
      ```yaml
      # ./project_cv_overrides.config.yaml
      description: "CV settings for My Special Project"
      css_files: ["./project_specific_cv.css"]      # Path relative to this override file
      pdf_options:
        format: "Legal"
      ```

    The project's main config file (from `--config`) is also the place to register project-local custom plugins. See the [Plugin Development Guide](docs/plugin-development.md) for details on registration.

#### Overriding Plugin Settings

To change how a specific plugin like `cv` looks or behaves, you can create a `cv.config.yaml` in your XDG folder (`~/.config/md-to-pdf/cv/`) for user-wide changes, or point to a project-specific override file from your project's main config (used with `--config`) for project-only changes.

#### CSS Merging with `inherit_css`

When `css_files` are specified in an override layer (XDG or Project plugin-specific):

  * `inherit_css: true` (boolean): Appends the CSS files from the current layer to those from lower layers.
  * `inherit_css: false` (boolean, default if not specified): Replaces all CSS files from lower layers with only those from the current layer.

### Front Matter and Placeholders

Markdown files can include YAML front matter for metadata and to enable dynamic content substitution.

#### Example Front Matter

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

### Dynamic Placeholders

* **Syntax:** `{{ .key }}` or `{{ .path.to.key }}` (e.g., `{{ .custom_data.key }}`). The `.` refers to the root of the data context (processed front matter).

* **Automatic Date Placeholders:**

    * `{{ .CurrentDateFormatted }}`: Current date, long format (e.g., "May 19, 2025").
    * `{{ .CurrentDateISO }}`: Current date, `YYYY-MM-DD` format.


## Creating and Using Custom Plugins

`md-to-pdf` is designed to be extensible. You can create your own plugins to define custom document structures, processing logic, styling, and PDF options.

**For a comprehensive guide on plugin development, including directory structure, handler scripts, registration, and advanced configuration, please see the [Plugin Development Guide](docs/plugin-development.md).**

## Testing

The project includes an integration test suite.

```bash
npm test
```

Test scripts and configurations are in [`test/`](test/), and [`test/config.test.yaml`](test/config.test.yaml), which should reflect the plugin structure.

For more details, see [`test/README.md`](test#readme).

## License

This project is licensed under the [MIT License](LICENSE).


