# md-to-pdf Cheat Sheet

Quick examples and syntax for `md-to-pdf` commands and configurations.

## Core Commands & Common Use Cases

**1. Convert a Basic Markdown File (Default Plugin)**

  * Uses the `default` plugin.
  * Outputs to the same directory as the input.
  * Auto-opens PDF if `pdf_viewer` is set.

    ```bash
    md-to-pdf convert my_document.md
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

**5. Batch Export Hugo Recipes**

  * Exports all recipes from a Hugo content folder.
  * Uses the `recipe` plugin for styling each exported PDF.
  * PDF names will be auto-generated (e.g., `slug-author-date.pdf`).

    ```bash
    md-to-pdf hugo-export-each ./my_hugo_site/content/posts/recipes --base-plugin recipe
    ```

**6. Convert a Document with Math (KaTeX)**

  * Assumes `math_rendering` is enabled in `config.yaml` or plugin config.
  * Uses the `default` plugin (or any plugin that supports math).
  * Input file: `examples/example-math.md`

    ```bash
    md-to-pdf convert examples/example-math.md --plugin default --outdir output
    ```

**7. Using a Project-Specific Configuration**

  * Overrides bundled/XDG settings with those in `project.config.yaml`.
  * Useful for project-specific styles or plugin registrations.

    ```bash
    md-to-pdf convert my_report.md --plugin report --config ./configs/project.config.yaml
    ```

**8. Using Only Factory Defaults**

  * Ignores all XDG and project-specific (`--config`) configurations.
  * Useful for debugging or getting a "vanilla" output.

    ```bash
    md-to-pdf convert my_doc.md --plugin default --factory-defaults
    ```

**9. List Discoverable Plugins**

  * Lists all plugins found via Bundled, XDG, and Project configurations.
  * Shows name, description, registration source, and config file path for each.
  * Respects global `--config` and `--factory-defaults` flags.
    
    ```bash     
    md-to-pdf plugin list
    md-to-pdf plugin list --factory-defaults
    ```

## Key Configuration Snippets (`config.yaml`)

**PDF Viewer:**

```yaml
# ~/.config/md-to-pdf/config.yaml OR project's config.yaml
pdf_viewer: xdg-open # Linux
# pdf_viewer: "open -a Preview" # macOS
# pdf_viewer: null # Disable auto-open
# pdf_viewer: firefox # Also an excellent choice
```

**Global PDF Options (e.g., Page Size, Margins):**

```yaml
# In global_pdf_options:
format: "A4"
margin: { top: "0.75in", bottom: "0.75in", left: "1in", right: "1in" }
printBackground: true
```

**Enabling Math (KaTeX) & Custom Macros:**

```yaml
math_rendering:
  enabled: true
  engine: "katex" # Currently only katex
  katex_options:
    throwOnError: false
    trust: false # SECURITY: incase user doesn't use @vscode version 
    macros:
      "\\RR": "\\mathbb{R}"
      "\\boldvec": "\\mathbf{#1}"
```

**Registering a Custom Plugin:**
(Assuming your plugin `my-notes` is in `~/my_md_plugins/my-notes-plugin/`)

```yaml
# In ~/.config/md-to-pdf/config.yaml OR project's --config file
document_type_plugins:
  # Bundled plugin overrides maybe listed here...
  # Custom plugin:
  my-notes: "~/my_md_plugins/my-notes-plugin/my-notes.config.yaml"
```

## Markdown & Front Matter Essentials

**Front Matter for Metadata & Placeholders:**

```yaml
---
title: "My Awesome Document"
author: "Your Name"
date: "{{ .CurrentDateISO }}" # Dynamic date
tags: ["notes", "project-x"]
custom_field: "Hello World"
---

# {{ title }}

Authored by: {{ author }} on {{ date }}.
Custom: {{ custom_field }}
Today's long date: {{ .CurrentDateFormatted }}
```

**Example**

```bash
md-to-pdf convert examples/example-front-matter.md --plugin default --outdir output
```

**Math Delimiters (KaTeX):**

  * Inline: `The equation is $E = mc^2$.`
  * Display: `$$ f(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi $$`
  * These won't work: `\\( ... \\)` (inline), `\\[ ... \\]` (display)

  * **Example**

    ```bash
    md-to-pdf convert examples/example-math.md --plugin default --outdir output
    ```

## Plugin Creation Basics

1.  **Directory Structure** (e.g., for `my-custom-plugin`):
    ```
    my-custom-plugin/
    ├── my-custom-plugin.config.yaml  # Defines CSS, handler, PDF options
    ├── index.js                      # Node.js handler logic
    └── my-custom-plugin.css          # Styles
    ```
2.  **Register** in a `config.yaml` (see "Registering a Custom Plugin" above).
3.  **Invoke**: `md-to-pdf convert my_file.md --plugin my-custom-plugin`

## Configuration Layers

Overrides apply in this order (highest wins):

1.  Project (`--config your_project.yaml`)
2.  XDG User (`~/.config/md-to-pdf/config.yaml` & `~/.config/md-to-pdf/<plugin>/<plugin>.config.yaml`)
3.  Bundled (tool's default `config.yaml` & `plugins/<plugin>/<plugin>.config.yaml`)

## Troubleshooting

  * **CSS Not Working?** Check paths in `css_files` (relative to the `*.config.yaml` they are in). Is `inherit_css: false` in an override, replacing all prior CSS?
  * **Math Issues?** Ensure `math_rendering.enabled: true`. Check delimiters and LaTeX syntax.
  * **Plugin Unknown?** Verify registration in `document_type_plugins` and path correctness. Use `md-to-pdf plugin list` (once implemented).

---

Refer to the full [`README.md`](README.md) for detailed explanations.

