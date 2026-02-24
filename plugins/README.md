# Bundled Plugins

These are the bundled plugins that come with **oshea**. This may be used as a quick **reference example** for how other external plugin collections can be structured and documented.

These plugins provide out-of-the-box functionality for various document types, demonstrating the power and flexibility of the **oshea** plugin system.

## Available Plugins

These plugins are automatically available when you install **oshea**. 

* [**Advanced Card**](advanced-card/) plugin is a business card with a QR code
* [**CV**](cv/) plugin for generating professional Curriculum Vitae or Resumes
* [**Cover Letter**](cover-letter/) plugin for formatted cover letters
* [**Default**](default/) plugin for basic documents like essays and letters
* [**Recipe**](recipe/) plugin is optimized for creating production recipes
* [**Recipe Book**](recipe-book/) is a generator for compiling multiple recipes into a recipe book
* [**Template Basic**](template-basic/) is the Default plugin with templating for archetyping new plugins

## Using Plugins

You can easily explore the bundled plugins and any other registered plugins directly from the command line.

### List Available Plugins

```bash
oshea plugin list
```

This command will show all plugins that **oshea** can find, including those from this bundled collection, any user-added collections, and individual plugins.

### Per-Plugin Help

```bash
oshea plugin help <pluginName>
```

Replace `<pluginName>` with the name of any plugin (e.g., `cv`, `recipe-book`). This command will display detailed information about the plugin's features, expected front matter, and configuration notes.

## Converting Documents

Once you know the plugin name, you can use it with the `convert` or `generate` commands.

### Single File Conversion

```bash
oshea convert <markdownFile> --plugin <pluginName> [options]
```

*Example: Convert a CV*
```bash
oshea convert my_cv.md --plugin cv --outdir ./output
```

### Complex Document Generation

Some plugins, like `recipe-book`, are designed to generate documents from multiple sources or require specific arguments.

```bash
oshea generate <pluginName> [plugin-specific-options...] [options]
```

*Example: Generate a Recipe Book*
```bash
oshea generate recipe-book --recipes-base-dir ./all_my_recipes --filename "MyCookbook.pdf"
```

## Resources

### Cheat Sheet

See [Cheat Sheet](../docs/refs/cheat-sheet.md) for a comprehensive list of all **oshea** commands, their options, and quick syntax.

### Customizing Bundled Plugins

You can change the styles (CSS) and PDF settings (page size, margins, etc.) of any plugins without altering original files. This is done using oshea's flexible configuration system.

See the [Plugin Development Guide](../docs/guides/plugin-development.md) for more information.

### Creating Plugins

For building plugins from scratch--including directory structure, handler scripts, and registration--refer to the [Plugin Development Guide](../docs/guides/plugin-development.md).

## Commands


### Create a Plugin
```bash
oshea plugin create my-plugin --from cover-letter [options]
```

### Validate a Plugin
```bash
oshea plugin validate my-plugin
cd my-plugin
oshea my-plugin-example.md
```

### Add a Plugin
```bash
oshea plugin add my-better-letter
```

### Enable Plugins
```bash
oshea plugin enable my-plugin-group/my-better-letter
# or enable entire collections
oshea collection enable my-plugin-group
```

### Collections and Plugin Management

The collections manager makes it easy to manage plugins and collections of plugins.

### Add a Collection
```bash
oshea collection add my-plugin-group
# or add from GitHub
oshea collection add https://github.com/brege/oshea-plugins
# or add individual plugins
oshea plugin add my-plugin-group/my-better-letter
```
