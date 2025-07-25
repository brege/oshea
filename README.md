# md-to-pdf - Markdown to PDF Converter

A [Node.js](https://nodejs.org/) command-line tool that transforms [Markdown](https://daringfireball.net/projects/markdown/) files into beautifully styled PDFs. It features a powerful, extensible plugin system, making it incredibly versatile for creating anything from CVs and cover letters to recipe books and custom reports. `md-to-pdf` is built on:
[markdown-it](https://github.com/markdown-it/markdown-it) for Markdown parsing, and
[puppeteer](https://pptr.dev/) for high-quality PDF generation.

---

**The rise of AI tooling has brought enormous growth to universal Markdown usage. `md-to-pdf` is ideal for anyone who writes in Markdown but needs polished, professional, reproducible output for resumes, reports, presentations, and more.**

---

### Quick Start

```bash
# Convert a basic markdown file
md-to-pdf my-document.md

# Use a built-in plugin for styling
md-to-pdf my-resume.md --plugin cv

# Create a cover letter with professional formatting
md-to-pdf my-letter.md --plugin cover-letter
```

---

### Examples

This tool allows you to produce high-quality and re-usable, aesthetic documents.

| [CV Layout](plugins/cv) | [Cover Letter Layout](plugins/cover-letter) | [Recipe Layout](plugins/recipe) |
| :---------------: | :----------------: | :---------------: |
| <img src="docs/images/screenshots/example-cv.png" alt="CV Layout Screenshot" width="300"/> | <img src="docs/images/screenshots/example-cover-letter.png" alt="Cover Letter Screenshot" width="300"/> | <img src="docs/images/screenshots/example-recipe.png" alt="Recipe Screenshot" width="300"/> |
| [**Business Card**](plugins/advanced-card) | [**Restaurant Menu**](https://github.com/brege/md-to-pdf-plugins/tree/main/restaurant-menu) | [**D3.js Slide**](https://github.com/brege/md-to-pdf-plugins/tree/main/d3-histogram-slide) |
| <img src="docs/images/screenshots/advanced-business-card.png" alt="Business Card" width="300"/> | <img src="docs/images/screenshots/restaurant-menu.png" alt="Restaurant Menu" width="300"/>  | <img src="docs/images/screenshots/d3-histogram-slide.png" alt="D3.js Slide" width="300"/> | 

---

### Installation

Install `md-to-pdf` globally with `npm install -g md-to-pdf`, or locally.
```bash
git clone https://github.com/brege/md-to-pdf.git
cd md-to-pdf
npm install
npm link
```

---

### Working with Plugins

Use any plugin with your markdown files:

```bash
md-to-pdf convert my-resume.md --plugin cv
```

Take a look at the [Bundled Plugins](plugins/index.md) page for more examples.

**Watch mode:** `md-to-pdf` can watch for changes to your markdown and plugin files with `md-to-pdf --watch`.

> **Note:** The `convert` command is implicit when a markdown file is provided. For generators (like building recipe books), the distinction between `convert` and `generate` becomes important.

---

### Creating Custom Plugins

To customize layouts, you can archetype from existing plugins or create a new one from scratch.
```bash
md-to-pdf plugin create --from cover-letter my-better-letter --target-dir 'my-plugins'
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

---

This allows for great flexibility and re-usability. Plugins are portable and can be shared across projects.

---

### Creating Plugins with AI

Use the [helper script](scripts/ai/ai-context-generator.js) to build a context package for an AI prompt.

```bash
node scripts/ai/ai-context-generator.js --plugin default --filename ai-context.txt
```

See the [**AI Assisted Plugin Development Guide**](docs/ai/ai-assisted-plugin-development-guide.md) for more information. This uses built-in assets like the [**Plugin Contract**](docs/refs/plugin-contract.md), appends all plugin files, and [an interaction spec](docs/ai/interaction-spec.md) to guide the AI.

The command above specifies a base plugin to archetype from, the "default" plugin, although any plugin will work. [This is how the D3.js Slide was created.](https://github.com/brege/md-to-pdf-plugins/tree/main/d3-histogram-slide).

---

### Collections -- Managing Plugins

The collections manager makes it easy to manage plugins and collections of plugins.
```bash
md-to-pdf collection add my-plugins
# or add individual plugins
md-to-pdf plugin add my-plugins/my-better-letter
```

Enable plugins for use anywhere:
```bash
md-to-pdf plugin enable my-plugins/my-better-letter
# or enable entire collections
md-to-pdf collection enable my-plugins
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

* [Batch Processing](docs/guides/batch-processing-guide.md) - Creating a set of PDFs from a directory of markdown files.
Alternatively, the `generate` command is used to generate one PDF from a set of markdown files.

* [Plugin Development Guide](docs/guides/plugin-development.md) - Manual configurations and complex workflows.
* [Configuration Hierarchies](docs/guides/configuration-hierarchies.md) - Nitty-gritty details on the config hierarchy and how it's used.

---

### Usage & Commands

**Cheatsheet:** [`docs/refs/cheat-sheet.md`](docs/refs/cheat-sheet.md)

**Dynamic Tab-completion:**
```bash
echo 'source <(md-to-pdf completion)' >> ~/.bashrc
source ~/.bashrc
```

**Plugin Management Commands:**
```bash
md-to-pdf plugin help cv              # Plugin-specific help
md-to-pdf plugin list                 # List all plugins (add --short for brief)
md-to-pdf plugin validate my-plugin   # Validate plugin structure and tests
```

**Collection Commands:**
```bash
md-to-pdf collection list                                          # List collections
md-to-pdf collection add https://github.com/brege/md-to-pdf-plugins # Add remote collection
md-to-pdf update                                                   # Update plugins/collections
```

---

### Project Structure

The project and all its documentation (and many supporting files) is all indexed by [the librarian](scripts/linting/docs/librarian.js).
Each directory below has a mini-README (cf. main [`index.md`](docs/index.md)) that links to **all** documentation within the directory.

The librarian, together with the [**postman**](scripts/linting/docs/postman.js), ensures all documentation is properly indexed and linked.

**Docs** - [[`docs/`](docs/index.md)] - Documentation index (guides, reference, walkthroughs, vision, development sequence)

**Linting** - [[`linting/`](scripts/linting/index.md)] - Scripts to improve code quality and document indexes and interlinking

**Paths** - [[`paths/`](paths/index.md)] - The centralized path registry used by all app, test and auxiliary modules

**Plugins** - [[`plugins/`](plugins/index.md)] - Bundled plugins, and a higher level plugin overview

**Scripts** - [[`scripts/`](scripts/index.md)] - Utility scripts (using AI, batch processing, project management, etc.)

**Tests** - [[`test/`](test/index.md)] - Unit, integration and end-to-end tests. Life cycle, smoke, and linting tests. The test framework and how to use [mocha](https://mochajs.org/)

---

### Development & Testing

**Config precedence:** `--config` flag > user `~/.config/md-to-pdf/config.yaml` > `config.example.yaml`

**Plugin precedence:** `--plugin` flag > front matter > local `*.config.yaml` > default

[[`test/`](test/index.md)] - [[`linting/`](scripts/linting/index.md)] - [[`.mocharc.js`](.mocharc.js)]

This project has a rich testing framework. In addition to the in-situ tests bundled with each plugin, there are over 300 tests, ranging from unit, integration, end-to-end, and lifecycle tests, in a declarative, manifest-driven harness and factory mocking system. The best place to start is the [Test Index](test/index.md).

```bash
npm test
npm test -- --group collections
```

You can run the last tests that failed `npm run test:last-fails`. You can use the `npm run test:watch` command, which runs the tests in watch mode as well.

Plugins are easy to test.
```bash
md-to-pdf plugin validate my-plugins/my-better-letter
```
This checks if your plugin is self-activating, if the in-situ tests pass, and if the plugin's directory structure is valid, among other verifications.

**Development history.**

[ [`v0.10`](docs/archive/v0.10/) ]
[ [polish](docs/archive/v0.10/polish-checklist.md) ] ←
[ [linting](docs/archive/v0.10/linting-checklist.md) ] ←
[ [release candidate](docs/archive/v0.10/rc-checklist.md) ] ←
[ [refactor](docs/archive/v0.10/scripts.refactor.index.md) ] ←
[ [reorg](docs/archive/v0.10/reorganization-planner.md) ]
⋅ [ [`v0.9`](docs/archive/v0.9/) ]
[ [dream-board](docs/archive/v0.9/dream-board-v0.9.md) ]

[ [`v0.8`](docs/archive/v0.8/) ]
[ [dream-board](docs/archive/v0.8/dream-board-v0.8.md) ]
[ [changelog](docs/archive/v0.8/changelog-v0.8.md) ]
⋅ [ [`v0.7`](docs/archive/v0.7/) ]
[ [dream-board](docs/archive/v0.7/dream-board-v0.7.md) ]
[ [changelog](docs/archive/v0.7/changelog-v0.7.md) ]
⋅ [ [`v0.6` (and earlier)](docs/archive/v0.6/) ]
[ [roadmap](docs/archive/v0.6/roadmap.md)]

---

## License

This project is licensed under the [MIT License](LICENSE).
