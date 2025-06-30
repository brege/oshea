# md-to-pdf Cheat Sheet

Quick examples and syntax for `md-to-pdf` commands and configurations.

**Index of all Documentation: [`./docs/index.md`](./docs/index.md).**

## Core Commands

### Convert a Document (Default Plugin)

* Uses the `default` plugin if no other is specified.
* Auto-opens the PDF by default.

```bash
md-to-pdf plugins/default/default-example.md --outdir ./output
```

### Convert with a Specific Plugin

  * Uses the `cv` plugin for specialized CV formatting.

```bash
md-to-pdf convert plugins/cv/cv-example.md --plugin cv --outdir ./output
```

### Generate a Document (Complex Plugins)

  * Used for plugins like `recipe-book` that require additional arguments.

```bash
md-to-pdf generate recipe-book --recipes-base-dir ./test/fixtures/hugo-example --outdir ./output
```

### Watch Mode for Live Reloading

  * Automatically re-converts the document when the source file or its dependencies change.

```bash
md-to-pdf convert plugins/recipe/recipe-example.md --plugin recipe --watch
```

## Plugin & Collection Management

### Collections

  * **Add a collection** from a Git repository or local path:
    ```bash
    md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins
    md-to-pdf collection add ./path/to/local/collection
    ```
  * **List downloaded collections** and their status:
    ```bash
    md-to-pdf collection list names --short
    ```
  * **Update all Git-based collections:**
    ```bash
    md-to-pdf update
    ```
  * **Remove a downloaded collection:**
    ```bash
    md-to-pdf collection remove md-to-pdf-plugins
    ```

### Plugins

  * **Create a new plugin** from the default template:
    ```bash
    md-to-pdf plugin create my-new-plugin --dir ./my-plugins
    ```
  * **Create a plugin from an existing one** (archetyping):
    ```bash
    md-to-pdf plugin create my-custom-cv --from cv
    ```
  * **Validate a plugin** against the official contract:
    ```bash
    md-to-pdf plugin validate plugins/cv # [ my-plugins/my-custom-cv ]
    ```
    or, since bundled's are registered:
    ```bash
    md-to-pdf plugin validate cv # [ my-custom-cv ]
    ```
  * **Add and enable a local plugin** for system-wide use:
    ```bash
    md-to-pdf plugin add ./my-plugins/my-new-plugin
    ```
  * **List all usable plugins:**
    ```bash
    md-to-pdf plugin list
    ```
  * **List all usable plugins compactly:**
    ```bash
    md-to-pdf plugin list --short
    ```
  * **Get detailed help** for a specific plugin:
    ```bash
    md-to-pdf plugin help cv
    ```

## Configuration Inspection

  * **Display active global configuration:**
    ```bash
    md-to-pdf config
    ```
  * **Display the final, merged configuration for a plugin:**
    ```bash
    md-to-pdf config --plugin cv
    ```
  * **Output raw YAML** for scripting or copying:
    ```bash
    md-to-pdf config --plugin cv --pure
    ```

## Config Snippets (`config.yaml`)

  * **Set PDF Viewer:**
    ```yaml
    # In ~/.config/md-to-pdf/config.yaml
    pdf_viewer: xdg-open # Linux
    ```
  * **Define Global `params`:**
    ```yaml
    params:
      author: "Your Name"
    ```
  * **Override Plugin Settings:**
    ```yaml
    cv:
      pdf_options:
        format: "A5"
      css_files: ["./styles/custom-cv.css"]
    ```

## Markdown & Front Matter Essentials

  * **Front Matter for Metadata & Placeholders:**
    ```yaml
    ---
    title: "My Awesome Document"
    author: "{{ .author }}"
    md_to_pdf_plugin: "cv"
    ---
    ```
  * **Math Delimiters (KaTeX):**
      * Inline: `$E = mc^2$`
      * Display: `$$ \int_{-\infty}^\infty \hat{f}(\xi)e^{2 \pi i \xi x} d\xi $$`
  
  * **Date Placeholders:**
      * `{{ .CurrentDateFormatted }}` -\> "June 30, 2025"
      * `{{ .CurrentDateISO }}` -\> "2025-06-30"

## Tab-Completion

`md-to-pdf` has dynamic tab-completion for commands and options.

A hidden command that is ran during state-change operations like `update`, `add`, `enable`, etc:

```bash
md-to-pdf _tab_cache
```
