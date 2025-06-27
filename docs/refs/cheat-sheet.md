# md-to-pdf Cheat Sheet

Quick examples and syntax for `md-to-pdf` commands and configurations.

## Core Commands & Common Use Cases

**1. Convert a Basic Markdown File**

  * Uses the `default` plugin if no other plugin is specified via CLI, front matter, or a local `<filename>.config.yaml`.
  * Outputs to a system temporary directory by default.
  * Auto-opens PDF if `pdf_viewer` is set.
    Implicitly "convert" (Lazy Load):
    ```bash
    md-to-pdf my_document.md
    ```
    Explicitly "convert":
    ```bash
    md-to-pdf convert my_document.md
    # PDF will be in /tmp/md-to-pdf-output/ or similar
    ```

**2. Convert a CV (Specific Plugin & Output)**

  * Uses the `cv` plugin.
  * Specifies output directory and filename.
  * Disables auto-opening.
    ```bash
    md-to-pdf convert examples/example-cv.md --plugin cv --outdir exports --filename "JohnDoe_CV.pdf" --no-open
    ```

**2.b. Convert a CV with Watch Mode - Readably**

  * Uses the `cv` plugin.
  * Watches for changes in `my_cv.md` and related config/CSS.
    ```bash
    md-to-pdf convert 'examples/example-cv.md' \
      --plugin cv \
      --outdir exports/ \
      --filename "JohnDoe_CV.pdf" \
      --watch
    ```

**3. Convert a Recipe with Watch Mode**

  * Uses the `recipe` plugin.
  * Watches for changes in `my_recipe.md` and related config/CSS.
    ```bash
    md-to-pdf convert examples/example-recipe.md --plugin recipe --watch
    ```

**4. Generate a Recipe Book**

  * Uses the `recipe-book` plugin (a `generate` command type).
  * Specifies the source directory for individual recipe Markdown files.
    ```bash
    md-to-pdf generate recipe-book --recipes-base-dir examples/hugo-example --outdir ./books --filename "FamilyCookbook.pdf"
    ```

**4.b. Generate a Recipe Book with Watch Mode - Readably**

  * Uses the `recipe-book` plugin (a `generate` command type).
  * Watches for changes in `my_recipe.md` and related config/CSS.
    ```bash
    md-to-pdf generate recipe-book \
        --recipes-base-dir 'examples/hugo-example' \
        --outdir ./books \
        --filename "FamilyCookbook.pdf" \
        --watch
    ```

**5. Convert a Document with Math (KaTeX)**

  * Assumes `math` is enabled in the active configuration for the chosen plugin.
  * Uses the `default` plugin (or any plugin that supports math).
  * Input file: `examples/example-math.md`
    ```bash
    md-to-pdf convert examples/example-math.md --plugin default --outdir output
    ```

**6. Using a Project-Specific Configuration**

  * Overrides bundled/user global settings with those in `project.config.yaml`.
  * Useful for project-specific styles or plugin registrations.
    ```bash
    md-to-pdf convert my_report.md --plugin report --config ./configs/project.config.yaml
    ```

**7. Using Only Factory Defaults**

  * Ignores all user-global and project-specific (`--config`) configurations.
  * Useful for debugging or getting a "vanilla" output.
    ```bash
    md-to-pdf convert my_doc.md --plugin default --factory-defaults
    ```

**8. Batch Processing 'Eaches'**

  * For batch operations (e.g., converting all recipes from a Hugo content folder or other collections), `md-to-pdf` now recommends using external scripts.
  * See the [Batch Processing Guide](../guides/batch-processing-guide.md) for examples in Node.js and Bash.

    **Bash Example**
    ```bash
    ./scripts/batch_convert_hugo_recipes.sh ./examples/hugo-example \
                                            ./batch_output/hugo_recipes_bash \
                                            recipe
    ```

    **Node.js Example**
    ```bash
    node ./scripts/batch_convert_hugo_recipes.js \
        --source-dir ./examples/hugo-example \
        --output-dir ./batch_output/hugo_recipes_node \
        --base-plugin recipe
    ```

## Plugin & Collection Management Commands

These commands simplify managing plugins and collections directly from the CLI.

**1. Add a Plugin Collection**

  * Adds a plugin collection from a Git repository URL or local directory.
    ```bash
    md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins
    md-to-pdf collection add ./local-plugin-collection # Add from a local path
    ```

**2. List Plugin Collections**

  * Lists all currently managed plugin collections.
    ```bash
    md-to-pdf collection list
    ```

**3. Update Plugin Collections**

  * Updates a specific collection (if Git-sourced) or all collections.
    ```bash
    md-to-pdf collection update my-plugins-repo # Update a specific collection
    md-to-pdf collection update              # Update all managed collections
    ```

**4. Remove a Plugin Collection**

  * Removes a registered plugin collection.
    ```bash
    md-to-pdf collection remove my-plugins-repo
    ```

**5. List Discoverable Plugins**

  * Lists all plugins found via Bundled, User-Global, and Project configurations.
  * Shows name, description, registration source, and config file path for each.
  * Respects global `--config` and `--factory-defaults` flags.
    ```bash
    md-to-pdf plugin list
    md-to-pdf plugin list --available # List all plugins, including disabled ones
    md-to-pdf plugin list --enabled   # List only enabled plugins
    md-to-pdf plugin list --disabled  # List only disabled plugins
    md-to-pdf plugin list --factory-defaults
    ```

**6. Create New Plugin Boilerplate**

  * Generates a starting structure for a new plugin, optionally based on an existing one.
    ```bash
    md-to-pdf plugin create <your-plugin-name> [--dir <output-directory>] [--force]
    # Create a new plugin from scratch
    md-to-pdf plugin create my-invoice --dir ./custom-plugins
    # Archetype (create from) an existing plugin, e.g., 'cv'
    md-to-pdf plugin create my-custom-cv --from cv
    ```
    This creates `<output-directory>/<your-plugin-name>/` with `<your-plugin-name>.config.yaml`, `index.js`, `<your-plugin-name>.css`, and `README.md` (with a `cli_help` section).

**7. Enable a Plugin**

  * Activates a specific plugin.
    ```bash
    md-to-pdf plugin enable my-invoice
    ```

**8. Disable a Plugin**

  * Deactivates a specific plugin.
    ```bash
    md-to-pdf plugin disable my-invoice
    ```

**9. Remove a Plugin**

  * Removes a registered plugin (Currently for singletons only. Collection-based plugin removal is handled by `collection remove`).
    ```bash
    md-to-pdf plugin remove my-standalone-plugin # TODO: Singleton removal and purging
    ```

**10. Get Help for a Specific Plugin**

  * Displays detailed help information for a named plugin, sourced from its `README.md` front matter.
    ```bash
    md-to-pdf plugin help <pluginName>
    ```
    Example:
    ```bash
    md-to-pdf plugin help cv
    ```

## Configuration Inspection

**1. Display Active Global Configuration**

  * Shows paths to active main configuration files and global settings.
  * Respects global `--config` and `--factory-defaults` flags.
    ```bash
    md-to-pdf config
    ```
    Output with User-Global config active:
    ```
    # Configuration Sources:
    #   Primary Main Config Loaded: /home/user/.config/md-to-pdf/config.yaml (User-Global)
    #   Considered Bundled Main Config (config.yaml): /path/to/md-to-pdf/config.yaml

    # Active Global Configuration:

    pdf_viewer: xdg-open
    global_pdf_options:
      format: Letter
      # ... more global settings ...
    params:
      some_global_param: "value"
    # ... etc. ...

    # Note: This shows the global settings from the primary main configuration file.
    # To see the full effective configuration for a specific plugin, use 'md-to-pdf config --plugin <pluginName>'.
    ```

**2. Display Effective Configuration for a Specific Plugin**

  * Shows the fully resolved configuration for the specified plugin, including all applied overrides and merged global settings.
  * Also details the source files that contributed to this configuration.
  * Respects global `--config` and `--factory-defaults` flags.
    ```bash
    md-to-pdf config --plugin cv
    ```
    Example Output:
    ```
    # Effective configuration for plugin: cv

    description: Plugin for Curriculum Vitae (CV) documents.
    handler_script: index.js
    css_files:
      - /path/to/md-to-pdf/plugins/cv/cv.css
    pdf_options:
      format: A4
      # ... other effective PDF options for cv ...
    # ... etc. ...

    # Source Information:
    #   Plugin Base Path: /path/to/md-to-pdf/plugins/cv
    #   Handler Script Path: /path/to/md-to-pdf/plugins/cv/index.js
    #   Contributing Configuration Files (most specific last):
    #     - Primary Main Config (for global settings): /home/user/.config/md-to-pdf/config.yaml
    #     - /path/to/md-to-pdf/plugins/cv/cv.config.yaml
    #     - Inline override from user-global main config: /home/user/.config/md-to-pdf/config.yaml
    #     - (Potentially a local <filename>.config.yaml if it was used for this invocation)

    # Resolved CSS Files (order matters):
    #     - /path/to/md-to-pdf/plugins/cv/cv.css
    ```

**3. Display Pure Configuration (for Copy-Pasting)**

  * Use the `--pure` flag with `md-to-pdf config` (with or without `--plugin`) to output only the raw YAML configuration data.
  * This strips all comments, headers, and informational text, making it suitable for copying into a configuration file.
    ```bash
    md-to-pdf config --pure
    md-to-pdf config --plugin cv --pure
    ```
    Example Output for `md-to-pdf config --plugin cv --pure`:
    ```yaml
    description: Plugin for Curriculum Vitae (CV) documents.
    handler_script: index.js
    css_files:
      - /path/to/md-to-pdf/plugins/cv/cv.css
    pdf_options:
      format: A4
      # ... etc. ...
    # ... only the YAML content ...
    ```


## Config Snippets (`config.yaml`)

### PDF Viewer

```yaml
# ~/.config/md-to-pdf/config.yaml OR project's config.yaml
pdf_viewer: xdg-open # Linux
# pdf_viewer: "open -a Preview" # macOS
# pdf_viewer: null # Disable auto-open
# pdf_viewer: firefox # Also an excellent choice
```

### Global PDF Options (e.g., Page Size, Margins)

```yaml
# In global_pdf_options section of a main config.yaml:
format: "A4"
margin: { top: "0.75in", bottom: "0.75in", left: "1in", right: "1in" }
printBackground: true
```

### Enabling Math (KaTeX) & Custom Macros

```yaml
# In a plugin's *.config.yaml, or an override block for a plugin:
math:
  enabled: true
  engine: "katex" # Currently only katex
  katex_options:
    throwOnError: false
    trust: false # SECURITY: Set to true only if Markdown source is fully trusted
    macros:
      "\\RR": "\\mathbb{R}"
      "\\boldvec": "\\mathbf{#1}"
```

### Defining Parameters (`params`)

For placeholder substitution (e.g., `{{ .site.name }}`).

**Global `params`** (in main `config.yaml`)

```yaml
params:
  site:
    name: "My Awesome Site"
    url: "https://example.com"
  authorContact:
    name: "Default Author"
    email: "author@example.com"
```

**Local `<filename>.config.yaml` `params`** (highest config file precedence for `params`)

```yaml
# mydoc.config.yaml
params:
  document_status: "Draft for MyDoc"
  project_code: "Alpha123"
```

Document front matter `params` (or top-level keys) have the highest precedence overall. See [Plugin Development Guide](../guides/plugin-development.md#placeholder-context-and-params-merging-precedence) for full merge order.

### Registering a Custom Plugin

While CLI commands (`md-to-pdf collection add`) are the primary way to manage plugins, you can still manually register plugins via `config.yaml` for advanced setups or specific scenarios.

Assuming your plugin `my-notes`'s config is at `~/my_md_plugins/my-notes-plugin/my-notes.config.yaml`.

```yaml
# In ~/.config/md-to-pdf/config.yaml OR project's --config file
plugins: # Changed from document_type_plugins
  # Custom plugin registration:
  my-notes: "~/my_md_plugins/my-notes-plugin/my-notes.config.yaml"
```

### Overriding Plugin Settings (Inline)

In your main `config.yaml` (user-global or project-specific), you can override settings for any registered plugin by adding a top-level key with the plugin's name.

```yaml
# In ~/.config/md-to-pdf/config.yaml OR project's --config file
# Assuming 'cv' and 'recipe' plugins are already registered

cv: # Inline override for the 'cv' plugin
  description: "My customized CV settings"
  pdf_options:
    format: "Executive"
  css_files: ["./styles/custom_cv.css"] # Path relative to this config.yaml
  inherit_css: false # Replaces 'cv' plugin's default CSS

recipe: # Inline override for 'recipe'
  pdf_options:
    margin: { top: "0.5in", bottom: "0.5in" }
```

More details in the [Plugin Development Guide](../guides/plugin-development.md#overriding-plugin-settings).

## Markdown & Front Matter Essentials

**Front Matter for Metadata & Placeholders**

```yaml
---
title: "My Awesome Document"
author: "Your Name"
date: "{{ .CurrentDateISO }}" # Dynamic date
tags: ["notes", "project-x"]
custom_field: "Hello World"
# Specify plugin (optional, overrides local config & default)
md_to_pdf_plugin: "cv" # Or "./path/to/my_plugin_config.yaml"
# Define params (highest precedence for placeholder data)
params:
  page_specific_data: "Unique content for this page"
---

# {{ title }}

Authored by: {{ author }} on {{ date }}.
Custom: {{ custom_field }}
Page specific data: {{ .params.page_specific_data }}
Today's long date: {{ .CurrentDateFormatted }}
```

**Math Delimiters (KaTeX)**

  * Inline: `The equation is $E = mc^2$.`
  * Display: `$$ f(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi $$`
  * `\(` and `\[` are **not** supported by default.

## Plugin Creation Basics - `plugin create`

1.  **Generate Boilerplate**

    ```bash
    md-to-pdf plugin create my-custom-plugin --dir ./path/to/where/plugins_live
    # To archetype from an existing plugin:
    md-to-pdf plugin create my-custom-cv --from cv
    ```

    This creates `my-custom-plugin/` (or `my-custom-cv/`) containing:

      * `my-custom-plugin.config.yaml`
      * `index.js` (handler expecting `coreUtils` in constructor)
      * `my-custom-plugin.css`
      * `README.md` (with `cli_help` section)

2.  **Customize**

    Edit the generated files. The `index.js` handler will already be set up to use `DefaultHandler` via dependency injection.

3.  **Register (if not using CLI collection management)**

    If you're not using `md-to-pdf collection add` to manage this plugin, you might need to manually add your plugin to a `config.yaml` (see [Registering a Custom Plugin](#registering-a-custom-plugin) above).

4.  **Invoke**

    `md-to-pdf convert my_file.md --plugin my-custom-plugin`

## Configuration Overview & Precedence

### Choosing a Plugin (Highest to Lowest)

1.  **CLI Option** `md-to-pdf convert ... --plugin <nameOrPath>`
2.  **Markdown Front Matter** `md_to_pdf_plugin: "name"` (in `mydoc.md`)
3.  **Local Config File** `plugin: "name"` (in `mydoc.config.yaml`)
    *Example `mydoc.config.yaml` (for `mydoc.md`)*
    ```yaml
    plugin: "cv" # Specify plugin
    # Provide document-specific overrides:
    pdf_options: { format: "A6" }
    params: { status: "Draft for mydoc" }
    css_files: ["./local_style.css"] # Relative to this file
    ```
4.  **Default Plugin** (`default`) if none of the above specify a plugin.

### Settings & `params` Override Precedence (Highest to Lowest)

1.  **Local `<filename>.config.yaml`** (document-specific settings & `params`)
2.  **Front Matter** (`params` and top-level data from the Markdown file)
3.  **Project Main Config Overrides** (Inline blocks like `cv: { pdf_options: ... }` in the `--config` file)
4.  **User-Global Main Config Overrides** (Inline blocks in `~/.config/md-to-pdf/config.yaml`)
5.  **Plugin's Own Default `<pluginName>.config.yaml`** (Base settings & `params` from the plugin itself)
6.  **Global `params`** (From the active main `config.yaml` chosen from Project, User-Global, or Bundled)

## Troubleshooting

  * **CSS Not Working?** Check paths in `css_files` (relative to the `*.config.yaml` they are in, or the main config for inline overrides). Is `inherit_css: false` in an override, replacing all prior CSS?

  * **Math Issues?** Ensure `math.enabled: true` in the effective plugin config. Check delimiters and LaTeX syntax. Only `$$...$$`, `$...$` work with this implementation of KaTeX.

  * **Plugin Unknown?** Verify registration using `md-to-pdf plugin list`. If it's a new custom plugin, ensure it's either added via `md-to-pdf collection add` or manually registered in a loaded `config.yaml` file with a correct path.

  * **What config am I using?** See "Configuration Overview & Precedence". Use `md-to-pdf config` and `md-to-pdf config --plugin <name>` for details.

---

Refer to the full [`README.md`](../../README.md) and [Plugin Development Guide](../guides/plugin-development.md) for detailed explanations.

