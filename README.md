# md-to-pdf - Markdown to PDF Converter

A [Node.js](https://nodejs.org/) command-line tool that transforms [Markdown](https://daringfireball.net/projects/markdown/) files into beautifully styled PDFs. It features a powerful, extensible plugin system, making it incredibly versatile for creating anything from CVs and cover letters to recipe books and custom reports. `md-to-pdf` is built on:

  - [`markdown-it`](https://github.com/markdown-it/markdown-it) for Markdown parsing.
  - [Puppeteer](https://pptr.dev/) for high-quality PDF generation.

---

### Examples

See `md-to-pdf` in action\! These examples showcase the visual capabilities of some of the bundled plugins.

| [CV Layout](plugins/cv) | [Cover Letter Layout](plugins/cover-letter) | [Recipe Layout](plugins/recipe) |
| :-----------------------: | :------------------------: | :-----------------------: |
| <img src="docs/images/screenshots/example-cv.png" alt="CV Layout Screenshot" width="300"/> | <img src="docs/images/screenshots/example-cover-letter.png" alt="Cover Letter Screenshot" width="300"/> | <img src="docs/images/screenshots/example-recipe.png" alt="Recipe Screenshot" width="300"/> |
| [**Business Card**](plugins/advanced-card) | [**Restaurant Menu**](https://github.com/brege/md-to-pdf-plugins/tree/main/restaurant-menu) | [**D3.js Slide**](https://github.com/brege/md-to-pdf-plugins/tree/main/d3-histogram-slide) |
| <img src="docs/images/screenshots/advanced-business-card.png" alt="Business Card" width="300"/> | <img src="docs/images/screenshots/restaurant-menu.png" alt="." width="300"/>  | <img src="docs/images/screenshots/d3-histogram-slide.png" alt="D3.js Slide" width="300"/> | 
---

## Features

`md-to-pdf` empowers you with powerful features, especially for managing your document types.

### Integrated Plugin & Collection Management (CLI-Centric)

A cornerstone of `md-to-pdf` is its ability to directly manage plugins and plugin collections right from your command line. This makes customizing and extending the tool incredibly straightforward.

  * **Add Collections** \
    Easily incorporate new sets of plugins from remote Git repositories or local directories.
    ```bash
    md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins
    ```
  * **List What's Available** \
    See all discoverable plugins and managed collections on your system.
    ```bash
    md-to-pdf collection list
    md-to-pdf plugin list --available
    ```
  * **Update & Synchronize** \
    Keep your collections up-to-date with a simple command.
    ```bash
    md-to-pdf collection update my-plugins
    ```
  * **Enable/Disable Plugins** \
    Control which plugins are active for your projects.
    ```bash
    md-to-pdf plugin disable cv
    md-to-pdf plugin enable cv
    ```
  * **Create New Plugins** \
    Generate a boilerplate for a new plugin from scratch or archetype from an existing one, providing a unique and highly efficient way to start custom document types.
    ```bash
    md-to-pdf plugin create my-report
    md-to-pdf plugin create my-custom-cv --from cv
    ```
  * **Remove Collections** \
    Cleanly remove unwanted plugin collections or singletons.
    ```bash
    md-to-pdf collection remove my-old-collection
    md-to-pdf plugin remove my-standalone-plugin # TODO: Singleton removal and purging in next version
    ```

This direct, CLI-based approach simplifies what could also be a manual configuration process.
Indeed, `md-to-pdf` was built with a custom, multi-layered configuration system.
Some magic can be applied via detection of like-named configuration files, through front matter, or through CLI overrides. 


### Extensible Plugin System

Plugins are the heart of `md-to-pdf`, allowing you to define entirely new document types or customize existing ones with specific configurations, processing logic, and styling.

  * **Tailored Outputs** \
    Plugins enable specialized outputs for diverse needs—from professional CVs and cover letters to structured recipes or technical reports.
  * **Custom Processing** \
    Each plugin can include a handler script (`index.js`) to implement custom Node.js logic for advanced Markdown parsing, dynamic content generation, or bespoke HTML structures.
  * **Scoped Configuration & Styling** \
    Plugins bundle their own default configuration (`<plugin-name>.config.yaml`) and CSS files, ensuring self-contained behavior and appearance, all of which can be overridden.
  * **Bundled Plugins** \
    Get started quickly with a resume or cover letter with `md-to-pdf`: 
      
      - [`default`](plugins/default)
      - [`cv`](plugins/cv)
      - [`recipe`](plugins/recipe)
      - [`cover-letter`](plugins/cover-letter)
      - [`recipe-book`](plugins/recipe-book)
    

### Versatility

  * **Singletons/One-Offs** -- Convert individual Markdown files to PDF. The tool intelligently determines the plugin to use based on CLI arguments, front matter, or local configuration files.
  * **Collections/Books** -- Generate combined PDF documents like recipe books with optional covers and tables of contents, using plugins like `recipe-book`.
  * **Batch Exports (books/slides)** -- For processing multiple individual Markdown files (e.g., from content directories), `md-to-pdf` encourages the use of external scripts that call the `md-to-pdf convert` command. See the [Batch Processing Guide](docs/batch-processing-guide.md) for examples.

### Configurability

`md-to-pdf` uses a layered system for settings, enabling base configurations, personal defaults, and project-specific overrides. While the new CLI commands handle much of the plugin management,
[`config.yaml`](advanced-configuration.md)
files still offer granular control.

  * **Layered Settings** -- Control plugin appearance and behavior through a multi-tier configuration system.

  * **Front Matter** -- Use YAML front matter within Markdown files for document-specific data, self-activating plugins, and placeholders.
  
  * **Local Overrides** -- Utilize a local `<plugin-name>.config.yaml` for document-specific plugin choice and high-precedence settings overrides.
  
  * **Inspect Configuration** -- Use 
    ```bash
    md-to-pdf config
    ```
    to see your *effective* configuration to understand the active global settings, or `md-to-pdf config --plugin cv` to see the final merged settings for a specific plugin.

[`config.example.yaml`](config.example.yaml)

### Watch Mode

Use the `--watch` flag with `convert` and `generate` commands to automatically re-generate PDFs when source Markdown, plugin configurations, or plugin CSS files are modified.

```bash
md-to-pdf convert examples/example-recipe.md --plugin recipe --watch
```

### [LaTeX](https://en.wikipedia.org/wiki/LaTeX) Math Rendering

Displays mathematical notation using [KaTeX](https://katex.org/). Inline math is supported with `$...$` and display math with `$$...$$`, if you need it. See [`config.example.yaml`](config.example.yaml) for an example.

```bash
md-to-pdf convert examples/example-math.md # --plugin default
```

---

## Quick Start: What it's like to use

Get started swiftly with `md-to-pdf`.

**Convert a Markdown file to PDF**

```bash
md-to-pdf examples/example-cv.md
```

**Specify a plugin**

```bash
md-to-pdf convert examples/example-cv.md --plugin cv
```

**Add a new plugin collection from GitHub**

```bash
md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins 
```

**Create a new plugin from an existing template (e.g., `cv`)**

```bash
md-to-pdf plugin create my-custom-cv --from cv
```

---

### Documentation

#### Table of Contents

  - [Installation](#installation)
  - [Usage](#usage)
  - [Commands](#commands-overview)
  - [Configuration (Advanced)](#configuration)
  - [Plugins](#plugins---the-heart-of-md-to-pdf)
  - [Developers](#development--project-tracking)

#### Reference Guides

  - [Cheat Sheet](docs/cheat-sheet.md) - a quick reference guide to commands and options
  - [Plugin Development Guide](docs/plugin-development.md) - how to develop, manage, and customize plugins, including advanced configuration details
  - [Batch Processing Guide](docs/batch-processing-guide.md) - how to process multiple files using external scripts
  - [Project Roadmap](docs/roadmap.md) - changelog and the future of `md-to-pdf`

---

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

3.  **(Optional) Make the CLI globally available:**
    To run `md-to-pdf` from any directory:

    ```bash
    npm link
    ```

---

## Usage

The primary interface is [`cli.js`](cli.js). If globally linked, use `md-to-pdf`. Otherwise, from the project root, use `node ./cli.js`.

**Lazy Loading**

Quickly check the rendering of a Markdown file without explicitly using a plugin/template.

```bash
md-to-pdf examples/example-recipe.md
```

Output is saved to a temporary directory by default. Use `--outdir` and `--filename` to specify the output directory and file name.

```bash
md-to-pdf examples/example-recipe.md --outdir ./ --filename "example-recipe.pdf"
```

**Through Plugins**

The power is in the plugins.

```bash
md-to-pdf convert examples/example-recipe.md --plugin recipe
```

**Global Options**

  * `--config <path_to_config.yaml>`

    Specify a custom path to your main project-specific YAML configuration file. This file can register project-local plugins and override settings. 
    Useful for scripting multiple files in a batch.

  * `--outdir <directory>` (for `convert` and `generate`)

    Specifies the output directory for the PDF. 
    For the `convert` command (and the lazy load usage above), if this is not provided, the PDF will be saved to a system temporary directory (e.g., `/tmp/md-to-pdf-output/`), and the full path will be logged.

  * `--plugin <pluginNameOrPath>`

    Explicitly specify the plugin to use by its registered name or by a direct path to its configuration file or directory. This overrides plugin choices from front matter or local config files.

  * `--factory-defaults`

    Use only bundled default configurations and plugins, ignoring user (XDG) and project (`--config`) configurations. Useful for debugging or getting a "vanilla" output.

  * `--watch`

    Watch the source Markdown file for changes and re-convert it to PDF. Only applies to `convert` command.

  * `--help`, `convert --help`, `config --plugin cv --help`

    Display help for a specific command or plugin.

### Commands Overview

`md-to-pdf` has several commands for different conversion and management tasks:

  * **Default Command (Lazy Load Convert)**

    If you provide a Markdown file as the first argument without a specific command (like `convert` or `generate`), `md-to-pdf` implicitly acts like the `convert` command.

    ```bash
    md-to-pdf examples/example-cv.md # [--outdir ./output]
    ```

    It intelligently tries to determine the plugin to use (see [Plugin Specification & Precedence](docs/plugin-development.md#plugin-specification-and-precedence)).

  * **`convert <markdownFile>`**

    For converting single Markdown files to PDF.

      * Requires a `<markdownFile>` argument.
      * Can explicitly specify a plugin using `--plugin <pluginNameOrPath>`.
      * If `--outdir` is not specified, output defaults to a system temporary directory.
    
    ```bash
    md-to-pdf convert examples/example-recipe.md --plugin recipe
    md-to-pdf convert examples/example-cover-letter.md --plugin cover-letter --watch
    ```

  * **`generate <pluginName>`**

    For plugins that require more complex inputs or generate documents from sources other than a single Markdown file (e.g., recipe books).

    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir examples/hugo-example # [--filename "FamilyCookbook.pdf"]
    ```

  * **`collection`** -- A group of subcommands for managing plugin collections.

      * `collection add <source>` - Adds a plugin collection from a Git repository URL or local directory.
        ```bash
        md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins  --name brege-plugins
        md-to-pdf collection add ./my-custom-plugins
        ```
      * `collection list` - Lists all registered plugin collections.
        ```bash
        md-to-pdf collection list
        ```
      * `collection update [name]` - Updates a specific collection (if Git-sourced) or all collections.
        ```bash
        md-to-pdf collection update my-plugins-repo
        md-to-pdf collection update           # Updates all collections -- git, local
        ```
      * `collection remove <name>` - Removes a registered plugin collection.
        ```bash
        md-to-pdf collection remove my-plugins-repo
        ```

  * **`plugin`** -- A group of subcommands for managing individual plugins.

      * `plugin list` - Lists all discoverable plugins.
        ```bash
        md-to-pdf plugin list
        md-to-pdf plugin list --available     # List all plugins, including disabled ones
        md-to-pdf plugin list --enabled       # List only enabled plugins
        md-to-pdf plugin list --disabled      # List only disabled plugins
        ```
      * `plugin create <pluginName>` - Generates a boilerplate for a new plugin, optionally based on an existing one.
        ```bash
        md-to-pdf plugin create my-invoice    # Creates a basic new plugin
        md-to-pdf plugin create my-custom-cv --from cv # Archetypes from the 'cv' plugin
        ```
      * `plugin enable <pluginName>` - Enables a specific plugin.
        ```bash
        md-to-pdf plugin enable my-invoice
        ```
      * `plugin disable <pluginName>` - Disables a specific plugin.
        ```bash
        md-to-pdf plugin disable my-invoice
        ```
      * `plugin remove <pluginName>` - Removes a registered plugin 
        [**TODO:** Must consider all cases for **safety** here.] 
        Collection-based plugin removal is handled by `collection remove`.
        ```bash
        md-to-pdf plugin remove my-standalone-plugin # TODO: Singleton removal and purging
        ```
      * `plugin help <pluginName>` - Displays detailed help for a specific plugin.
        ```bash
        md-to-pdf plugin help cv
        ```

  * **`config`** -- Subcommand to inspect the active configuration settings.

    ```bash
    md-to-pdf config
    md-to-pdf config --plugin cv
    md-to-pdf config --plugin cv --pure
    ```

For detailed syntax, all available options, and more examples for each command, refer to the [**Cheat Sheet**](docs/cheat-sheet.md#core-commands--common-use-cases). For processing multiple files in a batch, see the [**Batch Processing Guide**](docs/batch-processing-guide.md).

---

## Configuration -- Advanced Details

`md-to-pdf` uses a layered system for settings, allowing you to have base settings, personal defaults, and project-specific changes. For an in-depth explanation of configuration layers, plugin registration via `config.yaml`, settings overrides, and placeholder data, please see the [**Plugin Development Guide**](docs/plugin-development.md#plugin-discovery-and-registration).

### Verifying Your Configuration

To understand the active global settings or the final merged settings for a specific plugin, use the `md-to-pdf config` command. This is very helpful for debugging.

```bash
md-to-pdf config
md-to-pdf config --plugin cv
```

See the [**Cheat Sheet**](docs/cheat-sheet.md#configuration-inspection) for more examples.

#### Config Example

**`md-to-pdf config --pure`**

```yaml
pdf_viewer: xdg-open
global_pdf_options:
  format: Letter
  printBackground: true
  margin:
    top: 1in
    right: 1in
    bottom: 1in
    left: 1in
global_remove_shortcodes:
  - ''

# --- TODO: consider doing this on a per-plugin basis, like Hugo does ---
math:
  enabled: true
  engine: katex
  katex_options:
    throwOnError: false
    trust: false

# --- TODO: redo these next two based on new collection management system ---
plugin_directory_aliases:
  core: ~/path/to/md-to-pdf/plugins/
  examples: ~/path/to/md-to-pdf/examples/
  tests: ~/path/to/md-to-pdf/test/custom_plugins/
  community: ~/path/to/md-to-pdf/community_plugins/
plugins:
  default: core:default/default.config.yaml
  cv: core:cv/cv.config.yaml
  cover-letter: core:cover-letter/cover-letter.config.yaml
  recipe: core:recipe/recipe.config.yaml
  recipe-book: core:recipe-book/recipe-book.config.yaml
  advanced-card: examples:custom_plugin_showcase/advanced-card/advanced-card.config.yaml
```

---

## Plugins - The Heart of `md-to-pdf`

The flexibility of `md-to-pdf` lies in its extensible plugin system. Plugins allow you to define entirely new document types or customize existing ones, each with its own specific configuration, processing logic, and styling.

This allows you (and chatbots) to create reproducible document types for all 
distribution needs in familiar JavaScript, CSS, and Markdown.

#### What Plugins Do

  * **Tailored Outputs:** Plugins enable specialized outputs for different needs, such as CVs, recipes, cover letters, technical reports, or even unique formats like presentation slides or business cards.
  * **Custom Processing:** Each plugin has a handler script (usually `index.js`) that can implement custom Node.js logic to parse Markdown, process data, generate dynamic content, or construct entirely custom HTML structures.
  * **Scoped Configuration & Styling:** Every plugin bundles its own default configuration (`<plugin-name>.config.yaml`) and CSS files, ensuring that its behavior and appearance are self-contained yet overridable.

#### Core Capabilities

  * **Bundled Plugins** -- `md-to-pdf` comes with several [built-in plugins](plugins#readme) like `default`, `cv`, `recipe`, `cover-letter`, and `recipe-book` to get you started.
  
  * **Custom Plugin Creation** -- You can easily scaffold and develop your own plugins to perfectly match your document requirements using the `md-to-pdf plugin create <your-plugin-name>` command.
  
  * **Flexible Configuration** -- Plugin settings, including PDF options, CSS, math rendering, and even custom parameters (`params`), can be defined within the plugin and further customized via the global, user, or project-level configuration layers.
  
  * [**Advanced Handling**](docs/plugin-development.md) -- For complex scenarios, plugins can bypass the standard Markdown-to-HTML processing and directly use core utilities to generate highly specific HTML layouts, as demonstrated by the `advanced-card` example.

This plugin architecture makes `md-to-pdf` not just a converter, but a versatile platform for producing a wide array of structured PDF documents.

**Dive Deeper**

  * To learn about the bundled plugins, see the [**Bundled Plugins Overview**](plugins/README.md).
  * For a complete guide on creating and managing your own plugins, including integrating community plugins and detailed configuration, refer to the [**Plugin Development Guide**](docs/plugin-development.md).

### Batch Processing 'Eaches'

To process multiple Markdown files in a batch job (e.g., converting all recipes in a directory to individual PDFs, or all weeks of a physics lab manual), example external scripts that call the `md-to-pdf convert` command for each file can be found in [`scripts/`](scripts/). 
The [**Batch Processing Guide**](docs/batch-processing-guide.md) provides examples of how to do this with a Node.js wrapper and through a fairly simple bash script.

---

## Testing

The project includes an integration test suite.

```bash
npm test
```

Test scripts and configurations are in [`test/`](test/), and [`test/config.test.yaml`](test/config.test.yaml), which should reflect the plugin structure.

For more details, see [`test/README.md`](test#readme).

To run tests more granularly, run

```bash
npm test -- help
```

**TODO:** There are currently ~50 tests, most of which are CLI integration tests 
lacking deeper coverage on archetyping, `create --from`, etc.
I am in the process of rewiring these in a testing manager--probably in [Ava](https://github.com/avajs/ava).

---

## Development & Project Tracking

For ongoing development, historical changes, and future plans, please refer to the following documents.

**[Changelogs](docs/changelog-vX.Y.md) -- `docs/changelog-vX.Y.md`**  
Detailed records of changes, new features, and bug fixes for each version series, starting with `changelog-v0.7.md`, are the primary source for understanding what has been implemented.  
[v0.7](docs/changelog-v0.7.md)
·
[v0.8](docs/changelog-v0.8.md)

**[Dream Board](docs/dream-board-v0.8.md) -- `docs/dream-board-vX.Y.md`**  
This document captures broader, high-level ideas, potential future epochs, and long-term aspirations for `md-to-pdf` that are not yet concrete enough for a specific version proposal.  
[v0.7](docs/dream-board-v0.7.md)
·
[v0.8](docs/dream-board-v0.8.md)
·
[v0.9](docs/dream-board-v0.9.md)

**[Roadmap - Historical Overview](docs/roadmap.md) -- `docs/roadmap.md`**  
The `docs/roadmap.md` file now serves primarily as a **historical overview** of major features and milestones completed prior to v0.7.0. For current and future planning, please refer to the changelogs and dream board.  
[v0.1](https://github.com/brege/md-to-pdf/blob/b0b9fd026d4bebfb65edba4c07ab5a779f15bfff/ROADMAP.md)
·
[v0.2](https://github.com/brege/md-to-pdf/blob/32c448d17e2db25dbf1f47cb9d9a6fcc4361f723/ROADMAP.md)
·
[v0.3](https://github.com/brege/md-to-pdf/blob/4f947918755baffefe7aa29fc519a2f61970e102/ROADMAP.md)
·
[v0.4](https://github.com/brege/md-to-pdf/blob/9cde4a45726f8ad88041a68017309b79a16a27b9/docs/roadmap.md)
·
[v0.5](https://github.com/brege/md-to-pdf/blob/0c3eb2684ac71a02b73a0882a198a59b5b016e45/docs/roadmap.md)
·
[v0.6](https://github.com/brege/md-to-pdf/blob/fb0ef9bcd8555cdc5400599d6c99b4cdbf950702/docs/roadmap.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
