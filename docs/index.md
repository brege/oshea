# md-to-pdf Project Documentation

This document is a central index for all documentation within the `md-to-pdf` repo.
It organizes Markdown files by categorical purpose and voicing (cf. [Diátaxisk](https://diataxis.fr/) taxonomy),

**Active Documents and Checklists** \
*For convenience, these are symlinks to the latest version of each document below.*

- [**Linting Checklist**](linting-checklist.md): **Policy.**
  Linting and code quality strategy for the project.
* [**Release Candidate Checklist**](rc-checklist.md): **Hygiene.**
  Updating user docs and internal refactoring of code for ease of use.
* [**Reoganization Planner**](archive/v0.10/reorganization-planner.md): **Planning.**
  Strategy for the final polish, reorganization, and AI integration push.
* [**Dream Board**](dream-board.md): **Standardization**. 
  Focuses on testing, plugin architecture, and the remaining task-paths to v1.0.

There are also several indexes for the main components of the project.

**Indexes:**
[ [**Docs**](index.md) ]
[ [**Scripts**](../scripts/index.md) ]
[ [**Plugins**](../plugins/index.md) ]
[ [**Tests**](../test/index.md) ]

These indices are automatically managed by
[**`scripts/linting/docs/update-project-indices.js`**](../scripts/linting/docs/update-project-indices.js)
and configure via
[`.index-config.yaml`](../.index-config.yaml)
at the project root.

---

## 1. Reference Documentation

*Technical descriptions of the project's commands, APIs, and structure.*

* [**Project README**](../README.md):
  Provides a high-level overview, quick start, and feature summary.
* [Plugins Index](../plugins/index.md):
  Introduces the bundled plugins and how to use them.
* [Plugin Development Guide](guides/plugin-development.md): 
  Details the plugins development cycle in creating, configuring and managing plugins.
* [Configuration Hierarchies](guides/configuration-hierarchies.md):
  Nitty-gritty details of the configuration system and the hierarchical structure of plugin and system conf files.
* [**Cheat Sheet**](refs/cheat-sheet.md):
  Compactly lists CLI commands, common usage, and config snippets.
* [Plugin Contract](refs/plugin-contract.md): 
  Formalizes the contract that all plugins should adhere to--metadata, structure, validity.
* [**Scripts Index**](../scripts/index.md):
  An index of tools and utilities used by the project, from analysis to guides, documentation, linting, and more.
    
---

## 2. Tutorials & How-To Guides

*Practical walkthroughs providing demonstration and step-by-step instructions.*

* [Batch Processing Guide](guides/batch-processing-guide.md):
  Explains how to convert multiple Markdown files at once using external scripts that leverage the `md-to-pdf` CLI.
* [Walkthrough: A Plugin's Full Lifecycle](walkthroughs/full-lifecycle.md)
* [Walkthrough: Customizing a Plugin with Archetyping](walkthroughs/archetyping-a-plugin.md)
* [Walkthrough: Updating and Syncing Plugins](walkthroughs/updating-plugins.md)
* [Walkthrough: Creating a Deck of Digital Notecards](walkthroughs/generate-mobile-study-cards.md)

---

## 3. Architecture & Reasoning (Explanation)

*Discussions that explore the context and reasoning behind project decisions.*

### High-Level Vision & History
*The main "living" and archived documents of the project's evolution and direction--updated in commit timescales*

* [**Release Candidate Checklist**](rc-checklist.md): **Hygiene**. 
  Updating user docs and internal refactoring of code for ease of use.

- [**v0.10 Architecture Evolution**](docs/archive/v0.10/)
  - [Reorganization Planner for `src/`](docs/archive/v0.10/reorganization-planner.md).
    Housekeeping task to move-on from a flat `src/` directory along with [a progress report](archive/v0.10/test-refactor-require-path-progress.md).
  - [Fixing `test/` paths after re-organizing `src/`](docs/archive/v0.10/test-refactor-require-path-progress.md).
    Brittle assert and import patterns requiring several slices of refactory.
  - [Replacing `src/` paths to new Pathing Registry](archive/v0.10/replace-src-paths.md).
    Moving on to a central pathing registry to not repeat mistakes.  cf. [*Why I Should Make a Pathing Registry*](archive/v0.10/why-i-should-make-a-pathing-registry.md).
  - [Replacing `test/` paths to new Pathing Registry](archive/v0.10/replace-test-paths.md).
    Again fixing brittle test framework.
  - [**Index of Scripting Tools used during Refactor**](archive/v0.10/scripts.refactor.index.md). 
    Many of these scripts were parted out for linters to re-enforce updated standards.
    These clickthroughs resolve to GitHub, snapshotted at
    [v0.10.31](https://github.com/brege/md-to-pdf/releases/tag/v0.10.31),
    as the `scripts/refactor/` directory was removed.
* [**Dream Board v0.9**](archive/v0.9/dream-board-v0.9.md): **Standardization**.
  Focuses on testing, plugin architecture, and the remaining task-paths to v1.0.
  Muxes changelogs, task checklists, and outlook from a central, living document.
* [Dream Board v0.8](archive/v0.8/dream-board-v0.8.md): **Unification**. 
  Merges plugin and collection management under a single CLI.
* [Dream Board v0.7](archive/v0.7/dream-board-v0.7.md): **Plugin Installation**.
  Introduces the Collections Manager concept.
* [Changelog v0.8](archive/v0.8/changelog-v0.8.md):
  Chronologically lists the major changes in the v0.8.x series.
* [Changelog v0.7](archive/v0.7/changelog-v0.7.md):
  Chronologically lists the major changes in the v0.7.x series.
* [Roadmap](archive/v0.6/roadmap.md):
  Provides an historical overview of major features and milestones completed prior to v0.7.0.

### Design Decisions & Lucidity
*Transparency travelogues that track rationale, choices, regrets--updated in point-release timescales*

* [Should We Have Used a Config Library?](archive/v0.6/should-we-have-used-a-config-library.md):
  Journals the choices between bespoke config-system versus adopting a config library.
* [Plugin Validation Philosophy](archive/v0.9/schema-validation-philosophy.md):
  Explains the "warn, don't fail" approach to configuration schema validation.
* [Purge Command Deferral](archive/v0.8/should-cm-purge-orphans.md):
  Details the reasoning for deferring a potentially dangerous "purge" feature in favor of user data safety.
* [Test Structure Evolution](archive/v0.8/current-vs-proposed-test-structure.md):
  Provides an early look at the *ad hoc* brittle, mostly end-to-end, test structure before 
  [mocha](https://mochajs.org/), before test grouping.
* [Tab Completion Assay](archive/v0.9/tab-completion-assay.md):
  Breaks down tab-completion schemes into difficulty levels, design pathways, examples, and an optimal approach.
* [**Reorganization Planner**](archive/v0.10/reorganization-planner.md):
  Planning strategy for the final polish, reorganization, and AI integration push.
* [An Argument for Adding a Pathing Registry](archive/v0.10/why-i-should-make-a-pathing-registry.md):
  How adding a central lookup table makes re-organization of modules far less of a chore.

---

## 4. Testing & Quality Assurance

*Documentation that details the project's testing framework, strategy, and metrics that define project quality.*

### Strategy & Process
* [Test Suite Index](../test/index.md):
  Main entry point for test-related documentation. Details the test harness and adjoins the dynamic QA dashboard.
* [Test Generation Priority Order](../test/docs/test-generation-priority-order.md):
  Explains the ranked, multi-level testing strategy and the priority for module test implementation.
* [Audit Log](../test/docs/audit-log.md): 
  Logs known issues, limitations, and discrepancies discovered during testing and code audits.

### Technical Reference
* [Test Suite Checklist Level 1](../test/docs/checklist-level-1.md):
  Module integration test scenarios.
* [Test Suite Checklist Level 2](../test/docs/checklist-level-2.md):
  Subsystem integration test scenarios.
* [Test Suite Checklist Level 3](../test/docs/checklist-level-3.md):
  End-to-End CLI test scenarios.
* [Test Suite Checklist Level 4](../test/docs/checklist-level-4.md):
  End-to-End lifecycle test scenarios.
* [Help Text Checklist](../test/docs/help-text-checklist.md):
  Systematic review of CLI help text.

---

## 5. AI & Automation

*Guides and specifications for programmatic interaction with the plugin system.*

* [AI-Assisted Plugin Development Guide](ai/ai-assisted-plugin-development-guide.md):
  A how-to guide for using an AI to create new plugins.
  The core technical details of the plugin API, optimized for machine consumption.

* [AI Interaction Specification](ai/interaction-spec.md):
  The core technical details of the plugin API, optimized for human consumption.

---

## Uncategorized Documents
*A dynamically generated list of documents that have not yet been categorized.* \
*This list is automatically updated by [`scripts/linting/docs/update-project-indices.js`](../scripts/linting/docs/update-project-indices.js)*

<!-- uncategorized-start -->
<!-- uncategorized-end -->

