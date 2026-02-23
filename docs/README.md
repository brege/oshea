# oshea Project Documentation

This document is a central index for all documentation within the **oshea** repo.

## Indexes
* [Docs](README.md): This document
* [Paths](../paths/README.md) registry index
* [Plugins](../plugins/README.md) registry
* [Scripts](../scripts/README.md) for maintenance
* [Tests](../test/README.md) system overview
* [Utils](../src/utils/README.md) like formatters, loggers, etc.

## Guides
* [Claude Skills](guides/claude-skills.md): Examples of Claude and Codex plugin generation
* [Plugin Development Guide](guides/plugin-development.md): Building plugins form archetypes
* [Batch Processing Guide](guides/batch-processing-guide.md): Building books and decks
* [Configuration Hierarchies](guides/configuration-hierarchies.md): Config and Plugin hierarchies

## Reference
* [Cheat Sheet](refs/cheat-sheet.md): Compactly list of commands and options
* [Plugin Contract](refs/plugin-contract.md): Formalizes plugin metadata, structure, validity
* [Interaction Specification](refs/interaction-spec.md): Used for LLM's
    
## Tutorials
* [Walkthrough: A Plugin's Full Lifecycle](walkthroughs/full-lifecycle.md)
* [Walkthrough: Customizing a Plugin with Archetyping](walkthroughs/archetyping-a-plugin.md)
* [Walkthrough: Updating and Syncing Plugins](walkthroughs/updating-plugins.md)
* [Walkthrough: Creating a Deck of Digital Notecards](walkthroughs/generate-mobile-study-cards.md)


## Historical Documentation

### [v0.11](archive/v0.11/)
* [Task List for v0.11](archive/v0.11/tasklist-v0.11.md)
* [Error Group Registry from Paths](archive/v0.11/error-group-registry-from-paths.md)
* [Logger Renderer Adapter](archive/v0.11/logger-renderer-adapter.md)
* [Next Generation Testing](archive/v0.11/next-generation-testing.md)

### [v0.10](archive/v0.10/)
* [Release Candidate Checklist](archive/v0.10/rc-checklist.md) focuses on hygiene and code quality
* [Polish Checklist](archive/v0.10/polish-checklist.md).
* [Reorganization Planner](archive/v0.10/reorganization-planner.md) for v0.10 refactoring efforts
* [An Argument for Adding a Pathing Registry](archive/v0.10/why-i-should-make-a-pathing-registry.md)
* [Fixing `test/` paths after re-organizing `src/`](archive/v0.10/test-refactor-require-path-progress.md)
* [Replacing `src/` paths to new Pathing Registry](archive/v0.10/replace-src-paths.md)
* [Replacing `test/` paths to new Pathing Registry](archive/v0.10/replace-test-paths.md)
* [Linting Checklist](archive/v0.10/linting-checklist.md)

### [v0.9](archive/v0.9/)
* [Plugin Validation Philosophy](archive/v0.9/schema-validation-philosophy.md) for schema validation
* [Tab Completion](archive/v0.9/tab-completion-assay.md) scheme that's better than Node.js's default
* [Dream Board v0.9](archive/v0.9/dream-board-v0.9.md) **standardizes** testing and architecture

### [v0.8](archive/v0.8/)
* [Purge Command Deferral](archive/v0.8/should-cm-purge-orphans.md) for a data safety decision
* [Test Structure Evolution](archive/v0.8/current-vs-proposed-test-structure.md) from brittle harness to [Mocha](https://mochajs.org/)
* [Dream Board v0.8](archive/v0.8/dream-board-v0.8.md) merges plugin and collection management in one CLI
* [Changelog v0.8](archive/v0.8/changelog-v0.8.md)

### [v0.7](archive/v0.7/)
* [Dream Board v0.7](archive/v0.7/dream-board-v0.7.md) introduces the Collections Manager concept
* [Changelog v0.7](archive/v0.7/changelog-v0.7.md)

### [v0.6](archive/v0.6/)
* [Should We Have Used a Config Library?](archive/v0.6/should-we-have-used-a-config-library.md) for custom config system instead of lib.
* [Roadmap](archive/v0.6/roadmap.md) for milestones completed prior to v0.7.0
