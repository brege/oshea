### Project Reorganization Planner

This cosmetic refactor will deliver the code in a matured state to human users 
and facilitates LLM's to better understand the project's architecture,
features, and sources of truth.

This reorganization will be conducted in a series of stages, beginning with preparatory tooling and low-risk changes, and progressing to the more complex and impactful operations.

---

### Table of Contents

<!-- toc-start level-4 -->
- [ ] [P1 -- Stage 1 | Preparatory Tooling & Analysis](#p1-stage-1-preparatory-tooling-analysis)
  - [ ] [P1 | Step 1 -- Dependency Analysis -- "Before" Snapshot](#p1-step-1-dependency-analysis-before-snapshot)
  - [ ] [P1 | Step 2 -- Docs Link-Checker [ .md ]](#p1-step-2-docs-link-checker-md-)
  - [ ] [P1 | Step 3 -- Path Correction Script [ .js ]](#p1-step-3-path-correction-script-js-)
- [ ] [P2 -- Stage 2 | Low-Impact Reorganization -- Docs & Scripts](#p2-stage-2-low-impact-reorganization-docs-scripts)
  - [ ] [P2 | Step 1 -- Reorganize docs/ Directory](#p2-step-1-reorganize-docs-directory)
  - [ ] [P2 | Step 2 -- Update Documentation Indexer](#p2-step-2-update-documentation-indexer)
  - [ ] [P2 | Step 3 -- Reorganize scripts/ Directory](#p2-step-3-reorganize-scripts-directory)
  - [ ] [P2 | Step 4 -- Full Documentation Link Audit](#p2-step-4-full-documentation-link-audit)
- [ ] [P3 -- Stage 3 | Reorganize App and Test Code [ src/ + test/ ]](#p3-stage-3-reorganize-app-and-test-code-src-test-)
  - [ ] [P3 | Step 1 -- Re-organize src/ Directory](#p3-step-1-re-organize-src-directory)
  - [ ] [P3 | Step 2 -- Re-organize test/ Directory to mirror src/](#p3-step-2-re-organize-test-directory-to-mirror-src)
  - [ ] [P3 | Step 3 — Global Automated Path Correction](#p3-step-3-—-global-automated-path-correction)
  - [ ] [P3 | Step 4 — Iterative Test Suite Verification](#p3-step-4-—-iterative-test-suite-verification)
- [ ] [P4 -- Stage 4 | Reorganize Documentation [ docs/ + examples/ ]](#p4-stage-4-reorganize-documentation-docs-examples-)
  - [ ] [P4 | Step 1 -- Deprecate examples/ and Consolidate Assets](#p4-step-1-deprecate-examples-and-consolidate-assets)
  - [ ] [P4 | Step 2 -- Update Test Configurations](#p4-step-2-update-test-configurations)
  - [ ] [P4 | Step 3 -- Full System Verification](#p4-step-3-full-system-verification)
- [ ] [D2 -- Stage 5 | Documentation Content Overhaul](#d2-stage-5-documentation-content-overhaul)
- [ ] [ai -- Stage 6 | AI Reproducibility & Unified Examples](#ai-stage-6-ai-reproducibility-unified-examples)
  - [ ] [ai.0 | Step 1 -- Unified Walkthroughs](#ai0-step-1-unified-walkthroughs)
  - [ ] [ai.1 | Step 2 -- Machine-Readable Spec](#ai1-step-2-machine-readable-spec)
  - [ ] [ai.2 | Step 3 -- AI Prompting Guide](#ai2-step-3-ai-prompting-guide)
<!-- toc-end -->



---

### P1 -- Stage 1 | Preparatory Tooling & Analysis [ `scripts/` ]

To develop and utilize scripts that analyze the current codebase and can automate the most error-prone parts of the refactor. This stage is non-destructive; we are only building tools and gathering data.

#### P1 | Step 1 -- Dependency Analysis -- "Before" Snapshot

Generate a definitive map of the current source code's internal dependencies. We will use `madge` to create a JSON representation of the dependency graph.

**Command**
```bash
npx madge --json src/ > dependency-map-before.json 
```

This will generate a `dependency-map-before.json` file that serves as our ground truth. After the refactor, we can generate a new map and compare them to ensure all modules are still correctly wired.

#### P1 | Step 2 -- Docs Link-Checker [ `*.md` ]

Create a script to audit all Markdown files for dead links.

**`scripts/devel/docs-link-checker.js`**

> **How the Docs Link-Checker Works**
>
> Determines an index of all relative links in a Markdown file and replaces them with the correct new relative links. This ensures all links are still valid after the reorganization.
> These link fixes in this script should not be limited to relative `*.md` files--relative links to `*.js` files and project directories should also ideally be resolved.

**Check other tools for link-checking**
``` bash
npm install --save-dev markdown-link-check
npx markdown-link-check README.md
```

```
  [✓] docs/images/screenshots/advanced-business-card.png
  [✓] docs/images/screenshots/restaurant-menu.png
  [✓] docs/images/screenshots/d3-histogram-slide.png

  62 links checked.

  ERROR: 4 dead links found!
  [✖] plugins/advanced-card → Status: 400
  [✖] advanced-configuration.md → Status: 400
  [✖] test/docs/qa-dashboard.md → Status: 400
  [✖] # → Status: 404
```




#### P1 | Step 3 -- Path Correction Script [ `*.js` ]

Create a script to update relative `require()` paths in JavaScript files. 

**`scripts/require-updater.js`**

This script will recursively scan for `.js` files, parse out all `require()` statements with relative paths, and rewrite them to use the correct new relative path. 

> **How the Path Correction Script Works**
>
> This tool updates relative `require()` paths in JavaScript files after files are moved. For each file, it finds all `require()` statements with relative paths, determines where those modules are now located, and rewrites the import to use the correct new relative path. This ensures all internal dependencies remain valid after the reorganization.

---

### P2 -- Stage 2 | Low-Impact Reorganization [ `docs/` + `scripts/` ]

To implement the new, more organized directory structure for documentation and supporting scripts. This stage leverages the tools planned in Stage 1 to ensure a clean and verifiable transition.

#### P2 | Step 1 -- Reorganize `docs/` Directory

**Proposed directory structure**
```
docs/
├── core/
│   └── plugin-contract.md
├── design/
│   └── lucidity/
│       └── tab-completion-assay.md
├── images/
│   └── screenshots/
│       └── *.png
├── index.md
└── versions/
    ├── v0.7/
    ├── v0.8/
    └── v0.9/
        ├── change-log.md
        └── dream-board.md
```


The `docs/` directory should now be organized thematically, with better separation between user-facing
content and internal artifacts.
The `versions/` and `design/` directories are new subdirectories for storing versioned and deep-dive design documents, respectively.

#### P2 | Step 2 -- Update Documentation Indexer

Update the documentation indexer script to accommodate the new directory structure.

**`scripts/devel/index-docs.js`** 

> **How the Documentation Indexer Works**
>
> The script is already implemented. It recursively scans all Markdown files in the target directory. It uses `EXCLUSION_PATTERNS` to determine which paths to ignore, such as `plugins/*.md`, then builds a centralized index, `docs/index.md`, containing links to all accepted `*.md` files in the project root. Ran again, `docs/index.md` should automatically reflect the pathing of the reorganized content.

#### P2 | Step 3 -- Reorganize `scripts/` Directory

**Proposed directory structure**
```
scripts/
├── auto/
│   ├── batch_convert_hugo_recipes.{js,sh}
│   └── make-screenshots.sh           # (+) Moved from examples/
│
└── devel/
    ├── find-to-include-assertions.js
    ├── generate-cli-tree.js
    ├── generate-help-checklist.js
    ├── generate-toc.js
    ├── index-docs.js
    └── standardize-js-line-one-all.sh
```

The `scripts/` directory is then organized by function:
- **`auto/`** for automated/batch jobs
- **`devel/`** for developer utilities and indexing tools

**On `test/scripts/`**: Do not move these to the `scripts/` directory--keep the test environment self-contained and isolated from application-management scripts.

#### P2 | Step 4 -- Full Documentation Link Audit

Use the `scripts/devel/docs-link-checker.js` script to find and replace any broken relative links within the reorganized `docs/` directory.
The script should be used in a dry-run mode, showing how it proposes change the relative paths in the `docs/` directory.

---

### P3 -- Stage 3 | Reorganize App and Test Code [ `src/` + `test/` ]

To systematically refactor the application's source code from a flat structure into a set of logical, feature-based modules. This stage will use the `madge` dependency map for guidance and the path correction script for automation.

Cosmetically refactor `src/` and `test/` into parallel, feature-based modules. Move app and test files together to keep them in sync.

**Highly advised to use `git mv` here to preserve history and avoid conflicts.**

#### P3 | Step 1 -- Re-organize `src/` Directory 

Create a new directory structure in `src/`.

```
src/
├── cli/
│   ├── commands/
│   │   ├── collection/
│   │   ├── plugin/
│   │   └── ...
│   └── watch_handler.js
│
├── collections-manager
│   ├── commands
│   │   ├── add.js
│   │   └── ...
│   ├── ...
│   └── index.js
│
├── config/
│   ├── ConfigResolver.js
│   ├── main_config_loader.js
│   ├── plugin_config_loader.js
│   ├── asset_resolver.js
│   └── config_utils.js
│
├── core/
│   ├── default_handler.js
│   ├── markdown_utils.js
│   ├── pdf_generator.js
│   └── math_integration.js
│
├── plugins/
│   ├── PluginManager.js
│   ├── PluginRegistryBuilder.js
│   ├── plugin_archetyper.js
│   └── plugin_determiner.js
│
├── tab-completion/     # belongs in cli/ ?
│   ├── # (+) move generate-completion-dynamic-cache.js here ?
│   ├── engine.js
│   ├── cli-tree-builder.js
│   └── tracker.js
│
└── validation/
   ├── plugin-validator.js
   └── validators/
      └── v1.js
```


#### P3 | Step 2 -- Re-organize `test/` Directory to mirror `src/`

Replicate the application structure within the module integration tests.

```
test/
├── integration/
│   ├── config/
│   ├── core/
│   ├── collections-manager/
│   └── plugins/
├── e2e/
├── fixtures/
│   └── hugo-example/           # (+) Moved from examples/
├── docs/
│   ├── core/                   # Do not move these to docs/
│   └── ...
└── scripts/                    # Do not move these to scripts/
    ├── ...
    └── qa-dashboard.js
```

All application and test source files now reside in their categorized subdirectories. At this point, virtually all internal `require()` paths in both `src` and `test` are broken.

#### P3 | Step 3 — Global Automated Path Correction

Pilot on a single `src/` module and its corresponding test to verify before running globally.

**Highly advised to make use of `git restore` here.**

**Command**  
```bash
node scripts/devel/require-path-corrector.js src/ test/
```

#### P3 | Step 4 — Iterative Test Suite Verification

**Test groups (reflecting new structure)**
```js
// .mocharc.js (illustrative)
const groups = {
  pilot:     ['test/integration/core/default-handler.test.js'],
  core:      ['test/integration/core/**/*.js'],
  config:    ['test/integration/config/**/*.js'],
  plugins:   ['test/integration/plugins/**/*.js'],
  validation:['test/integration/validation/**/*.js'],
  cli:       ['test/integration/cli/**/*.js'],
  toolchain: [
    'test/integration/config/**/*.js',
    'test/integration/plugins/**/*.js',
    'test/integration/validation/**/*.js'
  ],
  e2e:       ['test/e2e/**/*.js'],
  all: [
    'test/integration/**/*.js',
    'test/e2e/**/*.js',
    'plugins/**/.contract/test/*.test.js'
  ]
}
```

**Workflow**
```
npm test -- --group pilot      # Fastest feedback, single module
npm test -- --group core       # Next, expand to core
npm test -- --group toolchain  # Then, toolchain-wide
npm test -- --group all        # Finally, full suite
```

- Debug failures: Is it a test path or an app path? Fix, rerun, repeat.
- Use your dependency map (`madge`) for reference as needed.

**Result**  
- All `require()` paths are corrected in one sweep.
- Test suite is your safety net: iterate until green.
- Project is now modular, maintainable, and fully verified.

---

### P4 -- Stage 4 | Reorganize Documentation [ `docs/` + `examples/` ]

To finalize the project's new structure by addressing the `examples/` directory and its contents, and to perform a comprehensive final verification of the entire refactor.

#### P4 | Step 1 -- Deprecate `examples/` and Consolidate Assets

**Target Directory Structures**
```
plugins/
├── advanced-card/      # promoted from examples/custom_plugin_showcase/
│   └── ...
├── cv/
│   └── cv-example.md
├── recipe/
│   └── recipe-example.md
└── ...

test/
├── fixtures/
│   └── hugo-example/   # moved from examples/
└── ...

examples/
├── example-cv.md       # symlink
├── example-recipe.md   # symlink
└── ...                 # (other symlinks or removed files)
```

- All real content is now in `plugins/` or `test/fixtures/`.
- `examples/` is just symlinks and convenience scripts.


#### P4 | Step 2 -- Update Test Configurations

Update any test files or configurations that might have hardcoded paths to the assets moved in the previous step.

- Search the `test/` directory for any references to `examples/`.

- Update these paths or rework the test configurations to point to the new locations or create new test fixtures.

#### P4 | Step 3 -- Full System Verification

Perform a final, comprehensive run of all tests and checks to ensure the entire refactor was successful.

1. **Automated Test** \
   **`npm test`**

2. **Generate Docs Index** \
   **`node scripts/devel/index-docs.js`**
   to refresh the **`docs/index.md`** file.
3. **Smoke Tests** \
   e.g.**`md-to-pdf plugin create --from cv`** etc.

The project reorganization should now be complete and verified. 

---


### D2 -- Stage 5 | Documentation Content Overhaul

To perform a comprehensive review and update of the *content* within all user-facing and developer-facing documentation. 

This stage explicitly assumes that all file paths and relative links are already correct.

1. **Rewrite `plugin-development.md`** \
   **This is a high priority.** The document's content must be rewritten to align with the modern, simplified development workflow. It will de-emphasize manual file creation and heavily promote `md-to-pdf plugin create my-plugin` as the standard, officially supported method for bootstrapping a new plugin.
2. **Update Core User Docs**: `README.md`, `plugin-contract.md`, `cheat-sheet.md`.
3. Sequence `docs/index.md` to methodically update each of the remaining docs.

### ai -- Stage 6 | AI Reproducibility & Unified Examples

To create the final assets that allow both an AI and a human developer to reliably generate new, compliant plugins. This stage builds directly upon the now-correct documentation and clean architecture.

#### ai.0 | Step 1 -- Unified Walkthroughs

This is the consolidating task. We will create a single set of "walkthrough" documents that serve as the primary example/tutorial resource.

> **Each walkthrough's steps will directly mirror the automated Level 4 E2E tests.**

These walkthroughs will become the new "examples" and "how-to's" for the project.

#### ai.1 | Step 2 -- Machine-Readable Spec

Author the dense and technical *Interaction Specification*. This document is for the AI. It will detail the internal APIs, the purpose of each file in the new modular structure, and the plugin contract rules.

#### ai.2 | Step 3 -- AI Prompting Guide

Author the final `Example Prompting Guide`. This provides concrete, copy-pasteable prompts for framing an AI to perform specific tasks, using the spec and walkthroughs as context.


