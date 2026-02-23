# oshea - Markdown to PDF Converter

A [Node.js](https://nodejs.org/) command-line tool that transforms [Markdown](https://daringfireball.net/projects/markdown/) files into beautifully styled PDFs. It features a powerful, extensible plugin system making it incredibly versatile for creating anything from CVs and cover letters to recipe books and custom reports.

Built on [markdown-it](https://github.com/markdown-it/markdown-it) for Markdown parsing and
[puppeteer](https://pptr.dev/) for PDF generation.

---

**The rise of AI tooling has brought enormous growth to universal Markdown usage. **`oshea`** is ideal for anyone who writes in Markdown but needs polished, professional, reproducible output for resumes, reports, presentations, and more.**

See [Creating Plugins with Claude Skills](#creating-plugins-with-claude-skills) for Claude and Codex.

---

### Quick Start

Convert a basic Markdown file to PDF
```bash
oshea my-document.md
```
Use a built-in plugin for styling
```bash
oshea my-resume.md --plugin cv
```
Create a cover letter with professional formatting
```bash
oshea my-letter.md --plugin cover-letter
```

---

### Examples

This tool allows you to produce high-quality and re-usable, aesthetic documents.

<table>
  <tr>
    <td><a href="plugins/cv">
      <img src="docs/images/screenshots/example-cv.png" width="300">
      <br><strong>CV Layout</strong></a>
    </td>
    <td><a href="plugins/cover-letter">
      <img src="docs/images/screenshots/example-cover-letter.png" width="300">
      <br><strong>Cover Letter Layout</strong></a>
    </td>
    <td><a href="plugins/recipe">
      <img src="docs/images/screenshots/example-recipe.png" width="300">
      <br><strong>Recipe Layout</strong></a>
    </td>
  </tr>
</table>
<table>
  <tr>
    <td><a href="plugins/advanced-card">
      <img src="docs/images/screenshots/advanced-business-card.png" width="300">
      <br><strong>Business Card</strong></a>
    </td>
    <td><a href="https://github.com/brege/oshea-plugins/tree/main/restaurant-menu">
      <img src="docs/images/screenshots/restaurant-menu.png" width="300">
      <br><strong>Restaurant Menu</strong></a>
    </td>
    <td><a href="https://github.com/brege/oshea-plugins/tree/main/d3-histogram-slide">
      <img src="docs/images/screenshots/d3-histogram-slide.png" width="300">
      <br><strong>D3.js Slide</strong></a>
    </td>
  </tr>
</table>

---

### Installation

```bash
git clone https://github.com/brege/oshea.git
cd oshea
npm install -g
```

---

### Working with Plugins

Use any plugin with your markdown files:
```bash
oshea convert my-resume.md --plugin cv
```

Take a look at the [Bundled Plugins](plugins/index.md) page for more examples.

**Watch mode:** `oshea` can watch for changes to your markdown and plugin files with `oshea --watch`.

> [!NOTE]
> The `convert` command is implicit when a markdown file is provided. For generators (like building recipe books), the distinction between `convert` and `generate` becomes important.

---

### Creating Custom Plugins

To customize layouts, you can archetype from existing plugins or create a new one from scratch.
```bash
oshea plugin create --from cover-letter my-better-letter --target-dir 'my-plugins'
```

This creates a complete plugin structure:
```bash
my-plugins/my-better-letter
├── .contract                       # schema and in-situ testing
├── my-better-letter.config.yaml    # plugin configuration (page size, versioning, etc)
├── my-better-letter.css            # custom CSS properties
├── my-better-letter-example.md     # example file
├── index.js                        # handler
└── README.md                       # plugin description (embedded --help text)
```

This allows for greater flexibility and re-usability. Plugins are portable and can be shared across projects.

---

### Creating Plugins with Claude Skills

Use the skill-first workflow documented in [**docs/ai/claude-skills.md**](docs/ai/claude-skills.md).

These references compose the technical contract agents follow when creating plugins:
* [Plugin Contract](docs/refs/plugin-contract.md)
* [AI Interaction Specification](docs/ai/interaction-spec.md)
* [Archetyping Walkthrough](docs/walkthroughs/archetyping-a-plugin.md)

#### Validate a Plugin
```bash
oshea plugin validate my-plugin
cd my-plugin
oshea my-plugin-example.md
```

Iterate with your agent until the plugin is satisfactory.

---

### Collections -- Managing Plugins

The collections manager makes it easy to manage plugins and collections of plugins.
```bash
oshea collection add my-plugins
# or add individual plugins
oshea plugin add my-plugins/my-better-letter
```

Enable plugins for use anywhere:
```bash
oshea plugin enable my-plugins/my-better-letter
# or enable entire collections
oshea collection enable my-plugins
```

This workflow lets you maintain a development repository with a self-activating testing area while providing production copies for use anywhere.

---

### Documentation

Many workflows and walkthroughs are available:

* [Walkthrough: A Plugin's Full Lifecycle](docs/walkthroughs/full-lifecycle.md)
* [Walkthrough: Customizing a Plugin with Archetyping](docs/walkthroughs/archetyping-a-plugin.md)
* [Walkthrough: Updating and Syncing Plugins](docs/walkthroughs/updating-plugins.md)
* [Walkthrough: Creating a Deck of Digital Notecards](docs/walkthroughs/generate-mobile-study-cards.md)

Other guides:

* [Batch Processing](docs/guides/batch-processing-guide.md) - Creating a set of PDFs from a directory of markdown files. Alternatively, the `generate` command builds a single PDF from multiple markdown files.
* [Plugin Development Guide](docs/guides/plugin-development.md) - Manual configurations and complex workflows.
* [Configuration Hierarchies](docs/guides/configuration-hierarchies.md) - Details on the config hierarchy and how it's used.

---

### Usage & Commands

**Cheatsheet:** [`docs/refs/cheat-sheet.md`](docs/refs/cheat-sheet.md)

**Dynamic Tab-completion**
```bash
echo 'source <(oshea completion)' >> ~/.bashrc
source ~/.bashrc
```

**Plugin Management Commands**
```bash
oshea plugin help cv              # Plugin-specific help
oshea plugin list                 # List all plugins (add --short for brief)
oshea plugin validate my-plugin   # Validate plugin structure and tests
```

**Collection Commands**
```bash
oshea collection list                                          # List collections
oshea collection add https://github.com/brege/oshea-plugins    # Add remote collection
oshea update                                                   # Update plugins/collections
```

---

### Project Structure

- [**Docs**](docs/index.md) - Documentation index and archives
- [**Paths**](paths/index.md) - The centralized path registry used by all app and test modules
- [**Plugins**](plugins/index.md) - Bundled plugins, and a higher level plugin overview
- [**Scripts**](scripts/index.md) - Utility scripts
- [**Tests**](test/index.md) - [Mocha](https://mochajs.org/)-based integration, end-to-end, and lifecycle tests.

---

### Development & Testing

- **Config precedence:** `--config` flag > user `~/.config/oshea/config.yaml` > `config.example.yaml`
- **Plugin precedence:** `--plugin` flag > front matter > local `*.config.yaml` > default

* [`test/index.md`](test/index.md)
* [`.mocharc.js`](.mocharc.js)

This project has a rich testing framework. In addition to the in-situ tests bundled with each plugin, there are over 300 tests, ranging from unit, integration, end-to-end, and lifecycle tests, in a declarative, manifest-driven harness and factory mocking system. The best place to start is the [Test Index](test/index.md).

```bash
npm test
npm test -- --group collections
```

Re-run last failures with `npm run test:last-fails`. Run tests in watch mode with `npm run test:watch`.

Plugins are easy to test.
```bash
oshea plugin validate my-plugins/my-better-letter
```
This checks if your plugin is self-activating and passes basic checks.

---

## License

This project is licensed under the [MIT License](LICENSE).
