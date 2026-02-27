# CLAUDE.md

Project-specific guidance for the [oshea](https://github.com/brege/oshea) repository.

## Project Overview

`oshea` is a Node.js CLI tool that converts Markdown to PDF using markdown-it + puppeteer, with an extensible plugin system for different document types (CVs, cover letters, recipes, etc.).

## Essential Commands

```bash
npm test -- --group integration  # (fast) Run full test suite (250+ integration tests)
npm test -- --group e2e          # (slow) Run full test suite (100+ end-to-end tests)
npm run lint                     # Custom linting system
npm run paths                    # Regenerate path registry after moving files

# Usage
node cli.js convert file.md --plugin cv       # Convert with plugin
node cli.js plugin create --from cv my-plugin # Create new plugin
node cli.js --watch                           # Watch mode
```

## Essential Documentation

- `README.md`
- `docs/guides/claude-skills.md`
- `docs/refs/interaction-spec.md`
- `docs/guides/configuration-hierarchies.md`
- `docs/guides/plugin-development.md`
- `docs/refs/cheat-sheet.md`
- `docs/refs/plugin-contract.md`

Documentation is indexed by `README.md` files throughout the repository. These offer one-line summaries of each topic.

## Architecture

**Path System**: All imports use centralized path registry at `paths/index.js` (auto-generated from `paths/paths-config.yaml`). Use `@paths` alias, never relative paths. See `paths/README.md` for details.

**Core Structure**:
- `src/cli/` - Command definitions and CLI logic
- `src/core/` - PDF generation and markdown processing pipeline
- `src/config/` - Hierarchical configuration system
- `src/plugins/` - Plugin management (PluginManager, registry, archetyper)
- `plugins/` - Built-in plugins (cv, cover-letter, recipe, etc.)

**Testing**: Manifest-driven test harness with factory mocking. See `test/README.md` for details.

## Configuration Hierarchy

1. CLI flags (highest precedence)
2. User config (`~/.config/oshea/config.yaml`)
3. `config.example.yaml` (lowest precedence)

Plugin manifests/config defaults are defined in each plugin's `default.yaml`.

See `docs/guides/configuration-hierarchies.md` for details.

## Development Notes

- All file moves require running `npm run paths` to update registry
- Plugins are self-contained with contract validation via `.contract` files
- Output formatters and logging specification: `src/utils/README.md`
- Validate plugins with `oshea plugin validate path/to/plugin`
- If modifying source code for PRs: **always** perform the [Essential Commands](#essential-commands)
- Submit PR's for new plugins to [oshea-plugins](https://github.com/brege/oshea-plugins)

## Code Rules

- File path headers are required in JavaScript files:
  - first comment must match the workspace-relative path
  - shebang may appear first if needed for executable files
  - `// console-ok` may appear second or third ONLY if `console.*` was pre-existing
- Do not call `console.*` for logging; use the project logger
- **Only** use `console.*` for temporary development instrumentation. 
  - Remove any new `console.*` calls before submitting a PR.
  - Don't add or remove pre-existing `console.*` if `console-ok`'s are set file-wide (header) or in-line
- Do not call `chalk.*` in application code; use the project formatters. Formatters call chalk.
- Do not add JSDoc block comments (`/** ... @param ... */`) to source files. Reserved for future v1.
- Do not use relative import/require paths or relative path fragments in path resolution; use `@paths`.
