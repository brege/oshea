# Cheat Sheet

Quick examples and syntax for **oshea** commands and configurations.

**Index of all Documentation: [`docs/README.md`](../README.md).**

## Core Commands

### Convert a Document (Default Plugin)

Uses the `default` plugin if no other is specified and auto-opens the PDF by default.

```bash
oshea plugins/default/default-example.md --outdir ./output
```

### Convert with a Specific Plugin

Uses the `cv` plugin for specialized CV formatting.

```bash
oshea convert plugins/cv/cv-example.md --plugin cv --outdir ./output
```

### Generate a Document (Complex Plugins)

Used for plugins like `recipe-book` that require additional arguments.

```bash
oshea generate recipe-book --recipes-base-dir ./test/fixtures/hugo-example --outdir ./output
```

### Watch Mode for Live Reloading

Automatically re-converts the document when the source file or its dependencies change.

```bash
oshea convert plugins/recipe/recipe-example.md --plugin recipe --watch
```

## Plugin Management

**Create a new plugin** from the default template:
```bash
oshea plugin create my-new-plugin --outdir ./my-plugins
```
**Create a plugin from an existing one** (archetyping):
```bash
oshea plugin create my-custom-cv --from cv
```
**Validate a plugin** against the official contract:
```bash
oshea plugin validate plugins/cv # [ my-plugins/my-custom-cv ]
```
or, since bundled plugins are registered:
```bash
oshea plugin validate cv # [ my-custom-cv ]
```
**Add and enable a local plugin** for system-wide use:
```bash
oshea plugin add ./my-plugins/my-new-plugin
```
**Add and enable a plugin from Git:**
```bash
oshea plugin add https://github.com/user/my-new-plugin
```
**Disable and remove an installed plugin:**
```bash
oshea plugin disable my-new-plugin
oshea plugin remove my-new-plugin
```
**List all usable plugins:**
```bash
oshea plugin list
```
**List all usable plugins compactly:**
```bash
oshea plugin list --short
```
**Get detailed help** for a specific plugin:
```bash
oshea plugin help cv
```

## Configuration Inspection

**Display active global configuration:**
```bash
oshea config
```
**Display the final, merged configuration for a plugin:**
```bash
oshea config --plugin cv
```
**Output raw YAML** for scripting or copying:
```bash
oshea config --plugin cv --pure
```

## Config Snippets (`config.yaml`)

**Set PDF Viewer:**
```yaml
# In ~/.config/oshea/config.yaml
pdf_viewer: xdg-open # Linux
```
**Override Plugin Settings:**
```yaml
cv:
  pdf_options:
    format: "A5"
  css_files: ["./styles/custom-cv.css"]
```

## Markdown & Front Matter Essentials

**Front Matter for Metadata & Placeholders:**
```yaml
---
title: "My Awesome Document"
author: "Your Name"
contact:
  email: "you@example.com"
oshea_plugin: "cv"
---
```
**Math Delimiters (KaTeX):**
* Inline: `$E = mc^2$`
* Display: `$$ \int_{-\infty}^\infty \hat{f}(\xi)e^{2 \pi i \xi x} d\xi $$`

**Date Placeholders:**
* `{{ .CurrentDateFormatted }}` -\> "June 30, 2025"
* `{{ .CurrentDateISO }}` -\> "2025-06-30"

## Tab-Completion

**oshea** has dynamic tab-completion for commands and options.

A hidden command that runs during state-change operations like
`plugin add/remove/enable/disable`:

```bash
oshea _tab_cache
```
