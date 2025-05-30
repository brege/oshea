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
  - [Plugins](#plugins---the-heart-of-md-to-pdf)
  - [Developers](#development--project-tracking)

#### Reference Guides

  - [Cheat Sheet](docs/cheat-sheet.md) - a quick reference guide
  - [Plugin Development Guide](docs/plugin-development.md) - how to manage and create new plugins
  - [Batch Processing Guide](docs/batch-processing-guide.md) - how to process multiple files using external scripts
  - [Project Roadmap](docs/roadmap.md) - changelog and the future of `md-to-pdf`

#### What it's like to use

**Convert a Markdown file to PDF**
```bash
md-to-pdf examples/example-cv.md
```

**Specify a plugin**

```bash
md-to-pdf convert examples/example-cv.md --plugin cv
```

## Features

  * **Extensible Plugin System**: Define new document types with custom processing, flexible configuration YAML's, CSS, and handler scripts. Plugins can be bundled with the tool, reside in your user-level XDG configuration directory, or be project-specific. Existing types are implemented as **plugins**:

      - [`default`](plugins/default)
      - [`cv`](plugins/cv)
      - [`cover-letter`](plugins/cover-letter)
      - [`recipe`](plugins/recipe)
      - [`recipe-book`](plugins/recipe-book)

  * **Versatility**

      * **Singletons**: Convert single Markdown files to PDF. The tool can intelligently determine the plugin to use based on CLI arguments, front matter, or local configuration files.
      * **Collections**: Generate combined PDF recipe books with optional covers and tables of contents using plugins like `recipe-book`.
      * **Batch Export**: For processing multiple individual Markdown files (e.g., from Hugo content directories or other collections), `md-to-pdf` encourages the use of external scripts that call the `md-to-pdf convert` command. See the [Batch Processing Guide](docs/batch-processing-guide.md) for examples.

  * **Configurability**

      * Set global options and register plugins in a main `config.yaml`.
      * Control plugin appearance and behavior through a multi-tier configuration system (see [**Configuration**](#configuration) below).
      * Use YAML front matter within Markdown files for document-specific data, plugin selection, and placeholders.
      * Utilize a local `<filename>.config.yaml` for document-specific plugin choice and high-precedence settings overrides.

  * **Watch Mode**

      * Use the `--watch` flag with `convert` and `generate` commands to automatically re-generate PDFs when source Markdown, plugin configurations, or plugin CSS files are modified.
        ```bash
        md-to-pdf convert examples/example-recipe.md --plugin recipe --watch
        ```

  * **[LaTeX](https://en.wikipedia.org/wiki/LaTeX) Math Rendering**

      * Displays mathematical notation using [KaTeX](https://katex.org/). Inline math is supported with `$...$` and display math with `$$...$$`, if you need it. See [`config.example.yaml`](config.example.yaml) for an example.
        ```bash
        md-to-pdf convert examples/example-math.md # --plugin default
        ```

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

**Lazy Loading**

Quickly check the rendering of a Markdown file without using a plugin/template.

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
  
  * `--outdir <directory>` (for `convert` and `generate`)
    
    Specifies the output directory for the PDF. For the `convert` command (and the lazy load usage above), if this is not provided, the PDF will be saved to a system temporary directory (e.g., `/tmp/md-to-pdf-output/`), and the full path will be logged.

  * `--plugin <pluginNameOrPath>` 

    Explicitly specify the plugin to use by its registered name or by a direct path to its configuration file or directory. This overrides plugin choices from front matter or local config files.
  
  * `--factory-defaults`

    Use only bundled default configurations and plugins, ignoring user (XDG) and project (`--config`) configurations. Useful for debugging or getting a "vanilla" output.

  * `--watch`

    Watch the source Markdown file for changes and re-convert it to PDF. Only applies to `convert` command.
    
  * `--help`, `convert --help`, `config --plugin cv --help`

    Display help for a specific command or plugin.


### Commands Overview

`md-to-pdf` has several commands for different conversion and generation tasks:

  * **Default Command (Lazy Load Convert)** 

    If you provide a Markdown file as the first argument without a specific command (like `convert` or `generate`), `md-to-pdf` implicitly acts like the `convert` command.

    ```bash
    md-to-pdf examples/example-cv.md # [--outdir ./output]
    ```

    It intelligently tries to determine the plugin to use (see [Plugin Specification & Precedence](#plugin-specification--precedence)).

  * **`convert <markdownFile>`**

    For converting single Markdown files to PDF.

    * Requires a `<markdownFile>` argument.
    * Can explicitly specify a plugin using `--plugin <pluginNameOrPath>`.
    * If `--outdir` is not specified, output defaults to a system temporary directory.

    ```bash
    md-to-pdf convert examples/example-recipe.md --plugin recipe
    ```
    
    ```bash
    md-to-pdf convert examples/example-cover-letter.md --plugin cover-letter --watch
    ```

  * **`generate <pluginName>`**

    For plugins that require more complex inputs or generate documents from sources other than a single Markdown file (e.g., recipe books).

    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir examples/hugo-example # [--filename "FamilyCookbook.pdf"]
    ```

  * **`plugin`**: A group of subcommands for managing plugins.

      * `plugin list` - Lists all discoverable plugins.

        ```bash
        md-to-pdf plugin list
        ```

      * `plugin create <pluginName>` - Generates a boilerplate for a new plugin.

        ```bash
        md-to-pdf plugin create my-invoice # [--dir ./custom-plugins]
        ```

      * `plugin help <pluginName>` - Displays detailed help for a specific plugin.

        ```bash
        md-to-pdf plugin help cv
        ```

  * **`config`**: Subcommand to inspect the active configuration settings.

    ```bash
    md-to-pdf config
    md-to-pdf config --plugin cv
    md-to-pdf config --plugin cv --pure
    ```

For detailed syntax, all available options, and more examples for each command, refer to the [**Cheat Sheet**](docs/cheat-sheet.md#core-commands--common-use-cases). For processing multiple files in a batch, see the [**Batch Processing Guide**](docs/batch-processing-guide.md).

## Configuration

`md-to-pdf` uses a layered system for settings. This lets you have base settings, personal defaults, and project-specific changes. For an in-depth explanation of configuration layers, plugin registration, settings overrides, and placeholder data, please see the [**Plugin Development Guide**](docs/plugin-development.md#plugin-discovery-and-registration).

### Main `config.yaml`

Global settings (like `pdf_viewer` or global `params` for placeholders) and plugin registrations are managed in a main `config.yaml` file. `md-to-pdf` looks for this file in the following order (highest precedence first)

1.  **Project-Specific** 

    Specified via the `--config <your-project-config.yaml>` CLI option.

2.  **User-Global** 

    Located at `~/.config/md-to-pdf/config.yaml`.

3.  **Bundled** 

    Found in the `md-to-pdf` installation directory (this is the fallback).

The `--factory-defaults` flag makes the tool use only the bundled `config.example.yaml`, ignoring all other configurations.

### Specifying and Customizing Plugins

How `md-to-pdf` determines which plugin to use and how its settings are applied involves several layers

* **Plugin Choice** 

  The plugin used for conversion is determined in this order of precedence

  1\. **`--plugin <nameOrPath>`** - command-line option.
    
  2\. **`md_to_pdf_plugin`** - key in your Markdown file's front matter.

  3\. **`plugin`** key in a local **`<filename>.config.yaml`* file (in the same directory as your Markdown file).
  
  4\.  The **`default`** plugin if no other is specified.

* **Plugin Settings Overrides**

  Once a plugin is chosen, its default settings can be customized. Higher precedence settings override lower ones
    
    1\.  Local `<filename>.config.yaml` (for document-specific overrides).
    
    2\.  Project-specific main `config.yaml` (inline overrides).
    
    3\.  User-Global main `config.yaml` (inline overrides at `~/.config/md-to-pdf/config.yaml`).
    
    4\.  The plugin's own default `*.config.yaml`.

* **Global `params` and Placeholders**

    You can define reusable data in the `params` section of your main `config.yaml`, a local `<filename>.config.yaml`, or your document's front matter.
    This data can then be used as placeholders (e.g., `{{ .myParam }}`) in your Markdown content. Front matter `params` take the highest precedence.

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

math:
  enabled: true
  engine: katex
  katex_options:
    throwOnError: false
    trust: false

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

## Plugins - The Heart of `md-to-pdf`

The true power and flexibility of `md-to-pdf` lie in its extensible plugin system. Plugins allow you to define entirely new document types or customize existing ones, each with its own specific configuration, processing logic, and styling.

#### What Plugins Do

* **Tailored Outputs** \
  Plugins enable specialized outputs for different needs, such as CVs, recipes, cover letters, technical reports, or even unique formats like presentation slides or business cards.
* **Custom Processing** \
  Each plugin has a handler script (usually `index.js`) that can implement custom Node.js logic to parse Markdown, process data, generate dynamic content, or construct entirely custom HTML structures.
* **Scoped Configuration & Styling** \
  Every plugin bundles its own default configuration (`<plugin-name>.config.yaml`) and CSS files, ensuring that its behavior and appearance are self-contained yet overridable.

#### Core Capabilities

* **Bundled Plugins** 

  `md-to-pdf` comes with several [built-in plugins](plugins#readme) like `default`, `cv`, `recipe`, `cover-letter`, and `recipe-book` to get you started.

* **Custom Plugin Creation** 

  You can easily scaffold and develop your own plugins to perfectly match your document requirements using the `md-to-pdf plugin create <your-plugin-name>` command.

* **Flexible Configuration** 
 
  Plugin settings, including PDF options, CSS, math rendering, and even custom parameters (`params`), can be defined within the plugin and further customized via the global, user, or project-level configuration layers.

* [**Advanced Handling**](docs/plugin-development.md)

  For complex scenarios, plugins can bypass the standard Markdown-to-HTML processing and directly use core utilities to generate highly specific HTML layouts, as demonstrated by the `advanced-card` example.

* **Community and Custom Plugin Integration**

  * `md-to-pdf` is designed for easy integration of plugins from various sources, including your own bespoke creations or collections from the community.
  * Utilize features like `plugin_directory_aliases` in your main configuration to manage and incorporate external plugin collections, such as those you might clone from repositories.   

  The [**Community Plugins README**](community_plugins/README.md) guide provides details on how to organize and register these.

This plugin architecture makes `md-to-pdf` not just a converter, but a versatile platform for producing a wide array of structured PDF documents.

**Dive Deeper**
* To learn about the bundled plugins, see the [**Bundled Plugins Overview**](plugins/README.md).
* For a complete guide on creating and managing your own plugins, including integrating community plugins, refer to the [**Plugin Development Guide**](docs/plugin-development.md).

### Creating and Using Custom Plugins

`md-to-pdf` is designed to be extensible. You can create your own plugins to define custom document structures, processing logic, styling, and PDF options.

**For a comprehensive guide on plugin development, including directory structure, handler scripts, registration, and advanced configuration, please see the [Plugin Development Guide](docs/plugin-development.md).**

### Batch Processing 'Eaches'

To process multiple Markdown files in a batch job (e.g., converting all recipes in a directory to individual PDFs, or all chapters of a manual), example external scripts that call the `md-to-pdf convert` command for each file can be found in [`scripts/`](scripts/).  The **[Batch Processing Guide](docs/batch-processing-guide.md)** provides examples of how to do this with a Node.js wrapper and through a fairly simple bash script.


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


## Development & Project Tracking

For ongoing development, historical changes, and future plans, please refer to the following documents:

**[Changelogs](docs/changelog-vX.Y.md) - `docs/changelog-vX.Y.md`** \
Detailed records of changes, new features, and bug fixes for each version series, starting with `changelog-v0.7.md`, are the primary source for understanding what has been implemented. \
[v0.7](docs/changelog-v0.7.md) · [v0.8](docs/changelog-v0.8.md)

**[Dream Board](docs/dream-board-v0.8.md) - `docs/dream-board-vX.Y.md`** \
This document captures broader, high-level ideas, potential future epochs, and long-term aspirations for `md-to-pdf` that are not yet concrete enough for a specific version proposal. \
[v0.7](docs/dream-board.md) · [v0.8](docs/dream-board-v0.8)

**[Roadmap - Historical Overview](docs/roadmap.md) - `docs/roadmap.md`** \
The `docs/roadmap.md` file now serves primarily as a **historical overview** of major features and milestones completed prior to v0.7.0. For current and future planning, please refer to the changelogs and dream board. \
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


## License

This project is licensed under the [MIT License](LICENSE).

