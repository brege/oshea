# md-to-pdf Project Documentation

This document is a central index for all documentation within the `md-to-pdf` repo.
It organizes Markdown files by categorical purpose and voicing (cf. [Diátaxisk](https://diataxis.fr/) taxonomy),


---

## 1. Reference Documentation
*Technical descriptions of the project's commands, APIs, and structure.*

* [Project README](../README.md): Provides a high-level overview, quick start, and feature summary.
* [Plugins README](../plugins/README.md): Introduces the bundled plugins and how to use them.
* [Plugin Development Guide](plugin-development.md): 
  Details the plugins development cycle in creating, cnofiguring and managing plugins. Part reference, part walkthrough.
* [Cheat Sheet](cheat-sheet.md): Compactly lists CLI commands, common usage, and config snippets.
* [Plugin Contract](plugin-contract.md): Formalizes the contract that all plugins should adhere to--metadata, structure, validity.

---

## 2. Architecture & Reasoning (Explanation)
*Discussions that explore the context and reasoning behind project decisions.*

### High-Level Vision & History
*The main "living" documents of the project's evolution and direction--updated in commit timescales*

* [Dream Board v0.9](dream-board-v0.9.md): **Standardization**. Focuses on testing, plugin architecture, and the remaining task-paths to v1.0.
  Muxes changelogs, task checklists, and outlook from a central, living document.
* [Dream Board v0.8](dream-board-v0.8.md): **Unification**. Merges plugin and collection management under a single CLI.
* [Dream Board v0.7](dream-board-v0.7.md): **Plugin Installation**. Introduces the Collections Manager concept.
* [Changelog v0.8](changelog-v0.8.md): Chronologically lists the major changes in the v0.8.x series.
* [Changelog v0.7](changelog-v0.7.md): Chronologically lists the major changes in the v0.7.x series.
* [Roadmap](roadmap.md): Provides an historical overview of major features and milestones completed prior to v0.7.0.

### Design Decisions & Lucidity
*Transparency travelogues that track rationale, choices, regrets--updated in point-release timescales*

* [Should We Have Used a Config Library?](lucidity/should-we-have-used-a-config-library.md):
  Journals the choices between bespoke config-system versus adopting a config library.
* [Plugin Validation Philosophy](lucidity/schema-validation-philosophy.md):
  Explains the "warn, don't fail" approach to configuration schema validation.
* [Purge Command Deferral](lucidity/purge.md):
  Details the reasoning for deferring a potentially dangerous "purge" feature in favor of user data safety.
* [Test Structure Evolution](lucidity/current-vs-proposed-test-structure.md):
  Provides an early look at the *ad hoc* brittle, mostly end-to-end, test structure before 
  [mocha](https://mochajs.org/), before test grouping.

---

## 3. Tutorials & How-To Guides

*Practical walkthroughs providing demonstration and step-by-step instructions.*

* [Batch Processing Guide](batch-processing-guide.md): Explains how to convert multiple Markdown files at once using external scripts that leverage the `md-to-pdf` CLI.
* [Collections Manager Walkthrough](../src/collections-manager/walkthrough.md):
  Uses the original `md-to-pdf-cm` CLI tool for remote plugin management.

**TODO:** Remove, and replace CM walkthough with walkthrough mirroring Level 4 lifecycle tests--just make them the same to save headaches.

---

## 4. Testing & Quality Assurance
*Documentation that details the project's testing framework, strategy, and metrics that define project quality.*

### Strategy & Process
* [Test README](../test/README.md):
  Details the test harness and adjoins the dynamic QA dashboard.
* [Test Generation Priority Order](../test/docs/test-generation-priority-order.md):
  Explains the ranked, multi-level testing strategy and the priority for module test implementation.
* [Audit Log](../test/docs/audit-log.md): 
  Logs known issues, limitations, and discrepancies discovered during testing and code audits.

### Technical Reference
* [Checklist Level 1](../test/docs/checklist-level-1.md): Module integration test scenarios.
* [Checklist Level 2](../test/docs/checklist-level-2.md): Subsystem integration test scenarios.
* [Checklist Level 3](../test/docs/checklist-level-3.md): End-to-End CLI test scenarios.
* [Checklist Level 4](../test/docs/checklist-level-4.md): End-to-End lifecycle test scenarios.

---

## 5. Untracked Documents
*A dynamically generated list of documents that have not yet been categorized.*
*This list is automatically updated by [`scripts/index-docs.js`](../scripts/index-docs.js).*

<!-- etc-start -->

<!-- etc-end -->

