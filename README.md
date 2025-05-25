# md-to-pdf - Markdown to PDF Converter 

A [Node.js](https://nodejs.org/) command-line tool that converts [Markdown](https://daringfireball.net/projects/markdown/) files into styled PDFs. It uses an extensible document type plugin system, making it suitable for CVs, cover letters, recipes, recipe books, or anything else in your printable stack. Built on top of:

  - [`markdown-it`](https://github.com/markdown-it/markdown-it) for Markdown parsing, and
  - [Puppeteer](https://pptr.dev/) for PDF generation.

### Documentation

#### Table of Contents

  - [Installation](#installation)
  - [Usage](#usage)
  - [Commands](#commands-overview)
  - [Configuration](#configuration)

#### Reference Guides

  - [Cheat Sheet](docs/cheat-sheet.md) - a quick reference guide
  - [Plugin Development Guide](docs/plugin-development.md) - how to manage and create new plugins
  - [Batch Processing Guide](docs/batch-processing-guide.md) - how to process multiple files using external scripts
  - [Project Roadmap](docs/roadmap.md) - changelog and the future of `md-to-pdf`

#### What it's like to use

**Resume**
```bash
md-to-pdf convert resume.md --plugin cv
```

**Cover Letter**

```bash
md-to-pdf convert cover-letter.md --plugin cover-letter
```

## Features

  * **Extensible Plugin System**: Define new document types with custom processing, configurations (local `*.config.yaml`), CSS, and handler scripts. Plugins can be bundled with the tool, reside in your user-level XDG configuration directory, or be project-specific. Existing types are implemented as **plugins**:

    - [`default`](plugins/default)
    - [`cv`](plugins/cv)
    - [`cover-letter`](plugins/cover-letter)
    - [`recipe`](plugins/recipe)
    - [`recipe-book`](plugins/recipe-book)

  * **Versatility**

    * **Singletons**: Convert single Markdown files to PDF using type-specific plugins.
    * **Collections**: Generate combined PDF recipe books with optional covers and tables of contents using plugins like `recipe-book`.
    * **Batch Export**: For processing multiple individual Markdown files (e.g., from Hugo content directories or other collections), `md-to-pdf` encourages the use of external scripts that call the `md-to-pdf convert` command. See the [Batch Processing Guide](docs/batch-processing-guide.md) for examples.

  * **Configurability**

    * Set global options and register plugins in a main `config.yaml`.
    * Control plugin appearance and behavior through a 3-tier configuration system: Bundled Defaults \< XDG User Settings \< Project-Specific Settings (via `--config`). Plugin settings can be overridden by pointing to a separate file or by defining them inline within the main XDG/Project config.
    * Use YAML front matter within Markdown files for document-specific data and placeholders.
    * *The [Configuration](#configuration) section below explains these features in detail. For creating new plugins, see the [Plugin Development Guide](docs/plugin-development.md).*

  * **Watch Mode**

    * Use the `--watch` flag with `convert` and `generate` commands to automatically re-generate PDFs when source Markdown, plugin configurations, or plugin CSS files are modified.

  * **[LaTeX](https://en.wikipedia.org/wiki/LaTeX) Math Rendering**

    * Displays mathematical notation using [KaTeX](https://katex.org/). Inline math is supported with `$...$` and display math with `$$...$$`. Other common LaTeX delimiters like `\(...\)` and `\[...\]` are not currently supported. See [`config.example.yaml`](config.example.yaml) for an example.

### Examples

| [CV Layout](plugins/cv)                     | [Cover Letter Layout](plugins/cover-letter)               | [Recipe Layout](plugins/recipe)            |
| :-----------------------------------: | :----------------------------------: | :---------------------------------: |
| <img src="docs/images/screenshots/example-cv.png" alt="CV Layout Screenshot" width="300"/> | <img src="docs/images/screenshots/example-cover-letter.png" alt="Cover Letter Screenshot" width="300"/> | <img src="docs/images/screenshots/example-recipe.png" alt="Recipe Sreenshot" width="300"/> |

## Prerequisites

  * **Node.js:** Version 18.0.0 or higher. See [nodejs.org](https://nodejs.org/).
  * **npm (Node Package Manager):** Usually included with Node.js.

##### Verify Installation

```bash
node -v
npm -v
```

## Installation

1.  **Clone the repository:**

  ```bash
  git clone https://github.com/brege/md-to-pdf
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

  This bundled `config.yaml` primarily handles registration of built-in plugins (under the `plugins` key) and can be used for global tool settings (like `pdf_viewer`). You can also set up user-level configurations (see [Configuration Lookup Order](#configuration-lookup-order) and the [Plugin Development Guide](docs/plugin-development.md).

4.  **(Optional) Make the CLI globally available:**
  To run `md-to-pdf` from any directory:

  ```bash
  npm link
  ```

## Usage

The primary interface is [`cli.js`](cli.js). If globally linked, use `md-to-pdf`. Otherwise, from the project root, use `node ./cli.js`.

**Global Options:**

  * `--config <path_to_config.yaml>`: Specify a custom path to your main project-specific YAML configuration file. This file can register project-local plugins and override settings.
  * `--outdir <directory>` (for `convert` and `generate`): Specifies the output directory for the PDF. For the `convert` command, if this is not provided, the PDF will be saved to a system temporary directory (e.g., `/tmp/md-to-pdf-output/`), and the full path will be logged.
  * `--factory-defaults` (or `--fd`): Use only bundled default configurations and plugins, ignoring user (XDG) and project (`--config`) configurations. Useful for debugging or getting a "vanilla" output.

### Commands Overview

`md-to-pdf` has several commands for different conversion and generation tasks:

  * **`convert`**: For converting single Markdown files to PDF using a specific plugin. If `--outdir` is not specified, output defaults to a system temporary directory.

  *Example:*
  ```bash
  md-to-pdf convert my_document.md --plugin cv --outdir ./pdfs
  # Example without --outdir (output goes to temp)
  md-to-pdf convert another_doc.md --plugin default
  ```

  * **`generate`**: For plugins that require more complex inputs or generate documents from sources other than a single Markdown file (e.g., recipe books).
  *Example (Recipe Book):*

    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir examples/hugo-example --filename "FamilyCookbook.pdf"
    ```

  * **`plugin`**: A group of subcommands for managing plugins.

    * `plugin list`: Lists all discoverable plugins.
      ```bash
      md-to-pdf plugin list
      ```

    * `plugin create <pluginName>`: Generates a boilerplate for a new plugin.
      ```bash
      md-to-pdf plugin create my-invoice # [--dir ./custom-plugins]
      ```

    * `plugin help <pluginName>`: Displays detailed help for a specific plugin.
      ```bash
      md-to-pdf plugin help cv
      ```

  * **`config`**: Subcommand to inspect the active configuration settings.
    ```bash
    md-to-pdf config
    md-to-pdf config --plugin cv
    md-to-pdf config --plugin cv --pure
    ```

For detailed syntax, all available options, and more examples for each command, please refer to the [Cheat Sheet](docs/cheat-sheet.md#core-commands--common-use-cases). For processing multiple files in a batch, see the [Batch Processing Guide](docs/batch-processing-guide.md).



## Configuration

`md-to-pdf` uses a layered system for settings. This lets you have base settings, personal defaults, and project-specific changes.

### Main `config.yaml` Locations & Precedence

`md-to-pdf` looks for a main `config.yaml` to load global settings (like `pdf_viewer`, global `params` for placeholders) and register plugins. The first one found in this order is used:

1.  **Project-Specific**  - Highest precedence
      
    `--config <your-project-config.yaml>`

2.  **User-Global** - Medium: your personal defaults

    `~/.config/md-to-pdf/config.yaml`

3.  **Bundled:** `config.yaml` in the `md-to-pdf` installation directory - Lowest precedence (fallback to tool defaults)

### Customizing Plugin Settings

Each plugin (e.g., `cv`, `recipe`) starts with its own default settings (from its `<pluginName>.config.yaml` file, like `plugins/cv/cv.config.yaml`). You can override these defaults:

1.  **For Your User (Personal Defaults)**

    Edit your user-global `~/.config/md-to-pdf/config.yaml`. Add a top-level section with the plugin's name:

    ```yaml
    # In ~/.config/md-to-pdf/config.yaml
    # ... other global settings like pdf_viewer, params ...

    plugins: # Register any custom plugins for your user here
      my-notes-plugin: "~/my_plugins/notes/notes.config.yaml"

    cv: # Overrides for the 'cv' plugin for your user
      description: "My personal CV style"
      pdf_options:
        format: "A4"
        margin: { top: "0.75in" }
      css_files: ["~/.config/md-to-pdf/styles/my_cv_theme.css"] # Path to your custom CSS
      # inherit_css: false # Default is false, replaces plugin's CSS. Set to true to append.
    ```

    Asset paths like `css_files` here are resolved relative to `~/.config/md-to-pdf/config.yaml` or can be absolute/tilde-expanded.

2.  **For a Specific Project**

    Edit your project's main configuration file (the one you use with `--config`). Add a top-level section with the plugin's name:

    ```yaml
    # In your project's main config.yaml (e.g., my_project/project_settings.yaml)
    # ... other project global settings ...

    plugins: # Register any project-local plugins here
      project-special-report: "./_plugins/report-style/report.config.yaml"

    cv: # Overrides for the 'cv' plugin specifically for THIS project
      description: "CV style for Project Alpha"
      pdf_options: { paperSize: "Letter" } # "format" is also valid, "paperSize" might be a typo in my thinking
      css_files: ["./cv_styles/project_alpha_cv.css"] # Path relative to this project_settings.yaml
    ```

    Asset paths like `css_files` here are resolved relative to this project configuration file.

##### Important Notes on Overrides

  * The `plugins` key within a main `config.yaml` is for registering the base location of plugin configuration files
  
    `plugins: { myplugin: "./path/to/myplugin.config.yaml" }`

  * The top-level keys (like `cv:` in the examples above) are for *overriding settings* of an already registered plugin.
  
  * For more advanced plugin management, including creating new plugins, see the [Plugin Development Guide](docs/plugin-development.md).

#### Verifying Your Configuration

Use `md-to-pdf config` to see the active global settings. Use `md-to-pdf config --plugin <name>` to see the final, merged settings for a specific plugin, which is very helpful for debugging.

### Global `params`, Front Matter, and Placeholders

`md-to-pdf` allows for dynamic content in your Markdown files through a combination of global parameters (defined in your main `config.yaml`) and document-specific YAML front matter.

#### Defining Global Parameters (`params`)

You can define reusable key-value pairs in your active main `config.yaml` (Bundled, User, or Project-specific) under a top-level `params:` key. These values become globally available as placeholders.

##### Example in `config.yaml`

```yaml
params:
  site:
    name: "My Company Website"
    defaultTheme: "Blue"
  contact:
    email: "info@example.com"
    phone: "555-123-4567"
  copyrightYear: "{{ .CurrentDateISO | slice:0:4 }}" # Example of a param using another placeholder
```

#### Front Matter

Markdown files can include YAML front matter for document-specific metadata and data.

##### Example Front Matter

```yaml
---
title: "My Document Title"
author: "Author Name"
date: "{{ .CurrentDateISO }}" # Uses a dynamic date placeholder
contact: # This will override the entire 'contact' object from global params for this document
  email: "document-specific@example.com" 
custom_data:
  key: "Some value"
---

Content with {{ .custom_data.key }} and today's date: {{ .CurrentDateFormatted }}.
Site theme: {{ .site.defaultTheme }}.
Contact via: {{ .contact.email }}.
```

**TODO:** Considering adding plugin keys in the front matter for automatic plugin configuration...

#### Placeholder Context and Precedence

When placeholders are processed (primarily by `DefaultHandler`-based plugins):

1.  Global `params` from your active main `config.yaml` are loaded.
2.  The document's YAML front matter is loaded.
3.  These two data sources are merged to create the context for placeholders.
4.  **Front matter takes precedence.** If a key exists in both the document's front matter and the global `params`, the value from the front matter will be used for that document. For nested objects, the override happens at the level the key is defined in front matter (e.g., defining `contact:` in front matter replaces the whole `contact:` object from `params`).
5.  **Automatic Date Placeholders** are also added to the context:
    * `{{ .CurrentDateFormatted }}`: Current date in a long format (e.g., "May 22, 2025").
    * `{{ .CurrentDateISO }}`: Current date in `YYYY-MM-DD` format.

#### Placeholder Syntax

* **Syntax:** `{{ .key }}` or `{{ .path.to.key }}` like `{{ .custom_data.key }}` or `{{ .site.name }}`). The leading `.` refers to the root of the combined data context.

* The system supports iterative substitution, so a placeholder in `params` or front matter can itself contain another placeholder (e.g., `copyrightYear` example above).


## Batch Processing 'Eaches'

To process multiple Markdown files in a batch job (e.g., converting all recipes in a directory to individual PDFs, or all chapters of a manual), example external scripts that call the `md-to-pdf convert` command for each file can be found in [`scripts/`](scripts/).  The **[Batch Processing Guide](docs/batch-processing-guide.md)** provides examples of how to do this with a Node.js wrapper and through a fairly simple bash script.


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

