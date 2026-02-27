# Configuration & Plugin Hierarchies

**oshea** uses a layered system for settings, allowing for global defaults, user-specific preferences, and project-level configurations. This guide details how configurations are loaded, how plugin behavior is determined, and how settings and data are merged.

---

## Configuration Hierarchy

The tool loads settings from multiple sources. Higher levels in this list take precedence over lower ones.

### Main `config.yaml` Locations

**oshea** looks for a main `config.yaml` file to load global settings (like `pdf_viewer`). The **first file found** in the following order is used:

1. **Project-Specific (`--config`)** \
   A path passed via the `--config <your-project-config.yaml>` CLI option. This is the most specific and has the highest precedence.
2. **User-Global (XDG)**: Located at `~/.config/oshea/config.yaml`. This file stores your personal defaults.
3. **Bundled Defaults**: The `config.example.yaml` file in the installation directory serves as the ultimate fallback.

> **Factory Defaults Flag**
> The `--factory-defaults` flag forces the tool to ignore all other configurations and use only the bundled defaults, which is useful for troubleshooting.

## Plugin Resolution and Settings Overrides

### How a Plugin is Chosen

When you run `oshea convert <file>`, the tool determines which plugin to use based on the following order (highest precedence first):

1. **`--plugin` CLI Option** \
   Directly specifies a plugin by name or path.
2. **`oshea_plugin` Front Matter** \
   A key in the Markdown file's YAML front matter. This is the primary self-activation path for documents and may be a registered plugin name or plugin config path.
3. **Local `<filename>.config.yaml`** \
   An accompanying config file (e.g., `my-doc.config.yaml` for `my-doc.md`) with a `plugin:` key.
4. **`default` Plugin** \
   The fallback if no other method is used.

### How Plugin Settings are Merged

Once a plugin is chosen (e.g., `cv`), its settings are merged from multiple layers. Higher levels override lower ones.

1. **Local `<filename>.config.yaml`** (Highest) \
   Overrides all other settings for a single document conversion. Asset paths (`css_files`) are resolved relative to this file.
2. **Project `config.yaml` Inline Overrides** \
   A top-level key matching the plugin's name (e.g., `cv:`) in a project-specific config provides project-wide overrides.
3. **User-Global `config.yaml` Inline Overrides** \
  Same as above, but in the user's global config.
4. **Plugin Defaults** (Lowest) \
   The settings defined in the plugin's own `<plugin-name>.config.yaml`.

---

## Placeholder Data

Placeholder data comes from document front matter.

- **Source** -- Markdown front matter in the current document.
- **Syntax** -- `{{ key }}` or `{{ .path.to.key }}`.
- **Tip** -- Put document-specific values directly in front matter to keep behavior explicit.

---

## Verifying Your Configuration

To debug and understand the final, merged settings for any context, use the `oshea config` command.

See the final, merged settings for any context:
```bash
oshea config
```

See the final, merged settings for the `cv` plugin:
```bash
oshea config --plugin cv
```

Get the raw YAML output for scripting:
```bash
oshea config --plugin cv --pure
```
