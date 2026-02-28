# Bundled Plugins

These are the bundled plugins that come with **oshea**. They provide out-of-the-box functionality for various document types. You can specify a plugin by `--plugin` or by Markdown front-matter. oshea's plugin system can create plugins from other plugins through archetyping and can install plugins from other people's GitHub.

## Available Plugins

These plugins are automatically available when you install **oshea**. 

* [**Advanced Card**](advanced-card/) plugin is a business card with a QR code
* [**CV**](cv/) plugin for generating professional Curriculum Vitae or Resumes
* [**Cover Letter**](cover-letter/) plugin for formatted cover letters
* [**Default**](default/) plugin for basic documents like essays and letters
* [**Recipe**](recipe/) plugin is optimized for creating production recipes
* [**Recipe Book**](recipe-book/) is a generator for compiling multiple recipes into a recipe book
* [**Template Basic**](template-basic/) is the Default plugin with templating for archetyping new plugins

A third-party index of plugins can be found at [github.com/brege/oshea-plugins](https://github.com/brege/oshea-plugins).

## Using Plugins


### Plugin Help

Every plugin has its own README. Every README contains front matter that is rendered as that plugin's help text when you run:

```bash
oshea plugin help <pluginName>
``` 

Replace `<pluginName>` with the name of any plugin (e.g., `cv`, `recipe-book`).

### List Available Plugins

This command will show all available plugins registered in **oshea**, including bundled plugins and user-added plugins.
```bash
oshea plugin list --short
```

## Converting Documents

Once you know the plugin name, you can use it with the `convert` or `generate` commands.

### Single File Conversion

```bash
oshea convert <markdownFile> --plugin <pluginName> [options]
```

*Example: Convert a CV*
```bash
oshea convert my_cv.md --plugin cv --outdir .
```

### Generating Books and Manuals

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

You can change the styles (CSS) and PDF settings (page size, margins, etc.) of any plugins without altering the original files. This is done using oshea's flexible configuration system.

See the [Plugin Development Guide](../docs/guides/plugin-development.md) for more information, or check out the [**Claude Skills Guide**](../docs/guides/claude-skills.md) for creating plugins with a coding agents like Claude or Codex.

## Commands

### Create a Plugin

One unique feature of oshea is the ability to create plugins by archetyping from existing plugins or plugins on GitHub. 

```bash
oshea plugin create my-plugin --from [cover-letter|path/to/plugin|https://github.com/user/my-plugin]
```

### Validate a Plugin

Before you ship your plugin, you can validate it with the `plugin validate` command.

```bash
oshea plugin validate my-plugin
cd my-plugin
oshea example.md
```

### Add a Plugin

Register your plugin or install a plugin from GitHub with `plugin add`.

```bash
oshea plugin add ./my-better-letter
oshea plugin add https://github.com/user/my-better-letter
```

### Enable, Disable, or Remove a Plugin
```bash
oshea plugin enable my-better-letter
oshea plugin disable my-better-letter
oshea plugin remove my-better-letter
```
