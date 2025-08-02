The next generation test system defined in [`docs/v0.11/next-generation-testing.md`](../../docs/v0.11/next-generation-testing.md), where we ported the old QA checklists into YAML's for complete metadata tracking has revealed a new pattern.  These files can become E2E, CLI, and Workflow/Lifecycle manifest files.

For information on test priority rankings and what the "levels" are defined by,
see [`test/archive/docs/test-generation-priority-order.md`](../archive/docs/test-generation-priority-order.md).  For all other test framework information, see [`test/index.md`](../index.md).  

This document is living document whose results will populate [`test/runners/smoke/index.md`](smoke/index.md),
or whatever location the new E2E base directory's path is defined as.

---

## Phase 1: Core Refactoring (High Priority)

- [x] Extract shared arg parsing - Both runners have duplicate parseArgs logic  
- [x] Rename harness → helpers - Fix terminology confusion  
- [x] Update both runners - Use shared logic  
- [x] Test direct runners - Ensure 
     ```bash
     node test/runners/smoke/*-test-runner.js` works
     ```
- [x] Enhance `--list` to show `tags` and rename `Scenarios` to `Steps`


## Phase 2: Proper Formatting (Medium Priority)

**Update smoke-like runners to project flavor**
- [x] Create `src/utils` formatter 
- [x] Update runners - Replace mixed console/logger calls  
- [x] Test direct runners again - w/ proper formatting 
  - [x] Is output from `--show` respected?
  - [x] Do the headers look ok?
- [x] Eliminate function duplication - Split out smoke/smoke-helpers.js
- [x] Unified formatting - both runners should use the same formatter

**Mocha integration of smoke-like runners**
- [x] Test unified formatting and functionality - Ensure mocha integration works
- [x] Fix coffeecup wrapper - Separate data stream from display logic  
- [x] Test coffeecup - Ensure mocha integration works (on the workflow-pilot) 

**Unify smoke-like runners**
- [x] Extract special showMode formatting
- [x] Fix overbearing header spamm; color execution command
- [x] Rename workflow-test-formatter.js to [`yaml-test-formatter.js`](../../src/utils/formatters/yaml-test-formatter.js)
- [x] Remove smoke-test-formatter.js
- [x] Rename smoke-helpers.js to [`yaml-test-helpers.js`](smoke/yaml-test-helpers.js)
- [x] Rename workflow-coffeecup.test.js to [`yaml-mocha.test.js`](smoke/yaml-mocha.test.js)
- [x] Re-generate pathing (name changes)
- [x] Unify smoke-test-runner.js and workflow-test-runner.js
- [x] Generalize runner for user-extensible workflows (remove smoke/workflow distinction)
- [x] Add CLI flag pass-through support (--coll-root, --outdir, --base-path)
- [x] Auto-detect YAML capabilities (discovery, workspace variables, validation types)
- [x] Add glob support for multiple YAML files using file-helpers.js integration

**User-Extensible Workflow System**
Transform test runners into user-facing batch processing tools:
```bash
# Multi-file glob support with filtering
node yaml-test-runner.js "test/runners/smoke/*.yaml" --grep plugin

# Validate plugins across collections (auto-detects workspace needs)
node yaml-test-runner.js bundled-plugins.yaml --coll-root ~/.md-to-pdf/collections/themes

# Custom user workflows (restaurant menus for holidays)  
node yaml-test-runner.js valentine-menu-workflow.yaml --outdir /tmp/valentine-tests --show

# Mix individual files and globs
node yaml-test-runner.js smoke-tests.yaml "custom/*.yaml" --grep validation

# Test all YAML files in directory
node yaml-test-runner.js "test/runners/smoke/*.yaml" --grep plugin

# Test specific patterns across directories
node yaml-test-runner.js "test/**/*validation*.yaml" --show

```

**Architecture**
- Auto-detection: Discovers YAML capabilities (discovery vs workspace vs simple tests)
- CLI pass-through: `--coll-root`, `--outdir`, `--base-path` passed to underlying commands  
- Glob expansion: Uses file-helpers.js for powerful pattern matching
- Backward compatibility: Original wrapper files maintained for existing workflows
- User-extensible: Any YAML file becomes a batch processing workflow tool

Users create declarative YAML workflows instead of complex bash scripts. System respects XDG/config paths by default, allows overrides for power users (themes, localizations, etc.).

**QoL / Errata**
- [ ] Consider aliasing yaml-test-runner.js into base CLI command
- [x] Ensure `--grep` quietly passes through unmatched files (during YAML-globbing)
- [x] Remove old runner files that are now redundant
- [x] Remove console-log debt completely. Mostly: `yaml-test-*.js`
- [x] Clean up all relative paths ***before phase 4*** 
- [x] Ensure all `test_id`'s are displayed in Mocha output
- [x] Move `test_id`'s as labels, then formatter can prepend them to the output description
- [x] Use `{{template}}` instead of `${TEMPLATE}`
- [x] Render `{{template}}` on output, and `--coll-root`, so I can copy-paste the command to test directly
- [x] Every header is being displayed as "Level 4 Workflow Tests" (fix this).  This title should originate only from the main declaration in the YAML manifest
- [x] Add `skip: true/false` to scenarios to skip them
- [x] Add `debug: true/false` to scenarios to debug them (for intermediate workflow steps)
- [x] Summaries are wildly inconsistent. Some are 0. See output at `./yaml-e2e-output.txt`.
- [x] Every tests says "Smoke Test: " where is it coming from?

**New**
- [x] \*Implement a test file for `plugin remove`.

---

## Phase 3: E2E Porting (Next-gen Testing)

### 3.1 YAML Runner
- [x] Determine the logical order in which to port old E2E tests into the new system
- [x] Define feature parity between old and new E2E test processes
- [x] Ported `*.manifest.js` into the new system at `*.manifest.yaml`

#### Analysis

**Coverage**
```
# YAML Runner
grep -R "description:" test/runners/smoke/*.yaml | wc -l
 64

# E2E Runner
grep -R "describe:" ../e2e/*.manifest.js | wc -l
 38
```

**Performance**
```
# YAML Runner
time node test/runners/smoke/yaml-test-runner.js test/runners/smoke/*.yaml
 ...
 real    2m43.915s
 user    2m35.372s
 sys    0m18.034s

# E2E Runner
time npm test -- --group e2e
 ...
 real    2m41.349s
 user    2m37.942s
 sys    0m19.061s
```

**Line Count**
```
# YAML Runner
wc -l *.yaml | tail -1
  528 total

# E2E Runner
wc -l ../e2e/*.manifest.js | tail -1
 1016 total
```

### 3.2 Mocha Runner
- [x] `yaml-mocha.test.js my-test.manifest.yaml`
- [x] `yaml-mocha.test.js *.manifest.yaml`
- [x] `npm run test:last-fails` (i.e. [`test/analytics/run-last-fails.js`](../analytics/run-last-fails.js))
- [x] [`.mocharc.js`](../../.mocharc.js)
- [x] `--grep` and `--group`
- [x] [`test/analytics/log-failures-reporter.js`](../analytics/log-failures-reporter.js)
- [ ] [`test/analytics/test-watcher.js`](../analytics/test-watcher.js)

#### Analysis
This needs a benchmark that is comparable to the performance of the old AND new system under mocha.
Perhaps mocha produces inefficiency in the old system that could also be present in the new system.

## Phase 4: Restructure (Low Priority)

**Prep (debt)**
- [ ] The nested path registries is tripping up LLM's and it's difficult to make
  progress in tricky parts you desperately need help with.  We'll just flatten the registry into
  `paths/index.js` instead.  Human's are not supposed to edit it anyway.
  - [ ] Run all tests one more time on the flattened registry.

**Main**
- [ ] Tree restructure `test/` - Reorg test structure to mirror source structure
- [ ] Update path registry - After files move  
- [ ] Remove old files - After files move

**Reflection Tree**
```
src/                                test/
├── cli/                            └── runners/
│   ├── commands/                       ├── e2e/     
│   │   ├── collection/                 │   ├── collection/
│   │   │   ├── add.command.js          │   │   ├── collection-add.manifest.yaml
│   │   │   ├── list.command.js         │   │   ├── collection-list.manifest.yaml
│   │   │   ├── remove.command.js       │   │   ├── collection-remove.manifest.yaml
│   │   │   └── update.command.js       │   │   └── collection-update.manifest.yaml
│   │   ├── config.command.js           │   ├── config.manifest.yaml
│   │   ├── convert.command.js          │   ├── convert.manifest.yaml
│   │   ├── generate.command.js         │   ├── generate.manifest.yaml
│   │   ├── plugin/                     │   ├── plugin/
│   │   │   ├── add.command.js          │   │   ├── plugin-add.manifest.yaml
│   │   │   ├── create.command.js       │   │   ├── plugin-create.manifest.yaml
│   │   │   ├── disable.command.js      │   │   ├── plugin-disable.manifest.yaml
│   │   │   ├── enable.command.js       │   │   ├── plugin-enable.manifest.yaml
│   │   │   ├── help.command.js         │   │   │
│   │   │   ├── list.command.js         │   │   ├── plugin-list.manifest.yaml
│   │   │   ├── remove.command.js       │   │   ├── plugin-remove.manifest.yaml (missing)
│   │   │   └── validate.command.js     │   │   └── plugin-validate.manifest.yaml
│   │   ├── plugin.command.js           │   └── (other smoke-tests.yaml blocks)  
│   │   └── update.command.js           ├── workflows/   
│   ├── config-display.js               │   └── {demo,happy,sad,walkthroughs}.manifest.yaml
│   └── get-help.jsi                    ├── integration/
├── collections/                        │   ├── collections/
├── completion/                         │   │
├── config/                             │   ├── config/
├── core/                               │   ├── core/
├── plugins/                            │   └── plugins/
├── utils/                              ├── linters/
│   ├── formatters/                     │   ├── code-linting.manifest.yaml
│   └── logger.js                       │   └── docs-linting.manifest.yaml
└── validators/                         └── validators/
    └── v1.js                               └── bundled-plugins.yaml (move from smoke) 

```

**Test-side renaming**
- [ ] Rename `yaml-*.js` files to `e2e-*.js` files, as old tests are removed and don't conflict with new E2E test files 

**App-side consistency**
- [ ] Move all of `src/cli/commands` into `src/cli` (this way `src/cli/ <--> test/runners/e2e/`)
- [ ] `mv src/cli/get-help.js src/plugins/plugin-help.js` (this only applies to plugins help-text)
- [ ] `mv src/plugins/validator.js src/plugins/plugin-validator.js` (consistency)
- [ ] `mv src/cli/config-display.js src/utils/formatters/config-formatter.js` (consistency)
- [ ] `mv src/utils/formatters/*-formatter.js src/utile/formatters/*.formatter.js` (good/bad idea?)

This phase is all shell and path registry work. Try not to get distracted.

There is an argument to just do
```
test/runners/e2e/
├── collection.manifest.yaml
├── config.manifest.yaml
├── convert.manifest.yaml
├── generate.manifest.yaml
├── global-flags.manifest.yaml
├── plugin.manifest.yaml
├── yaml-mocha.test.js
├── yaml-test-helpers.js
└── yaml-test-runner.js
```
or even
```
test/runners/e2e/
├── collection.manifest.yaml
├── base.manifest.yaml
├── plugin.manifest.yaml
├── yaml-mocha.test.js
├── yaml-test-helpers.js
└── yaml-test-runner.js
```
By putting them all in one file, you can make it more efficient (enable/disable, add/remove, etc.)

Compactly.
- `...e2e/*.manifest.yaml`                      (from `...smoke/*.manifest.yaml`)
- `...integration/**/*/*.manfest.js`            (no change)
- `...linters/*-linting.manifest.yaml`          (from `...linters/unit/*-linting.manifest.yaml`)
- `...workflows/workflows.manifest.yaml`        (from `...smoke/other*/workflow*.yaml`)
- `...validators/bundled-plugins.manifest.yaml` (from `...smoke/other*/bundle*.yaml`)

---

## Phase 5: Unify manifests with documentation

**Scripting**
- [ ] `test/config/metadata-level-3.yaml` combine into a complete `<level-3>.yaml` file
- [ ] `test/config/metadata-level-4.yaml` combine into a complete `<level-4>.yaml` file

How well will this work with the QA tools?

## Appendix: Checklist of Porting by Manifest and Test ID

These are surfaced from `test/config/metadata-level-3.yaml`

### test/runners/e2e/convert.manifest.js
- [x] `convert.manifest.yaml`
- [x] 3.1.1 - (Happy Path) Successfully converts a basic markdown file to PDF using the default plugin.
- [x] 3.1.2 - (Key Option) Successfully converts using a specified plugin via `--plugin`.
- [x] 3.1.3 - (Key Option) Successfully creates a PDF in a specified directory with `--outdir` and a custom name with `--filename`.
- [x] 3.1.4 - (Config Precedence) A `md_to_pdf_plugin` key in front matter is correctly used for conversion.
- [x] 3.1.5 - (Config Precedence) A `--plugin` CLI flag correctly overrides a plugin specified in front matter.
- [x] 3.1.6 - (Sad Path) Fails with a non-zero exit code when the input `<file>` does not exist.
- [x] 3.1.7 - (Sad Path) Fails with a non-zero exit code when a non-existent plugin is specified with `--plugin`.

### test/runners/e2e/generate.manifest.js
- [x] `generate.manifest.yaml`
- [x] 3.2.1 - (Happy Path) Successfully generates an artifact using a known generator plugin (e.g., `recipe-book`).
- [x] 3.2.2 - (Sad Path) Fails with a non-zero exit code if required plugin-specific options are missing.

### test/runners/e2e/config.manifest.js
- [x] `config.manifest.yaml`
- [x] 3.3.1 - (Happy Path) Correctly displays the global configuration.
- [x] 3.3.2 - (Key Option) Correctly displays the merged configuration for a specific plugin using `--plugin`.
- [x] 3.3.3 - (Key Option) Correctly outputs clean YAML when using the `--pure` flag.

### test/runners/e2e/plugin.manifest.js
- [x] `plugin-list.manifest.yaml`
- [x] 3.4.1 - Correctly lists plugins with the default (`--all`) filter.
- [x] 3.4.2 - Correctly filters for enabled plugins with `--enabled`.
- [x] 3.4.3 - Correctly filters for disabled plugins with `--disabled`.
- [x] 3.4.4 - Correctly filters for all available plugins with `--available`.

### test/runners/e2e/plugin-create.manifest.js
- [x] `plugin-create.manifest.yaml`
- [x] 3.5.1 - (Happy Path) Successfully creates a new plugin directory with boilerplate files.
- [x] 3.5.2 - (Key Option) Successfully archetypes a new plugin from a source with `--from`.
- [x] 3.5.3 - (Happy Path) A plugin created from the default template passes validation.
- [x] 3.5.4 - (Happy Path) A plugin archetyped from a valid bundled plugin passes validation.

### test/runners/e2e/plugin-add.manifest.js
- [x] `plugin-add.manifest.yaml`
- [x] 3.6.1 - (Happy Path) Successfully adds and enables a singleton plugin from a local path.

### test/runners/e2e/plugin-enable.manifest.js
- [x] `plugin-enable.manifest.yaml`
- [x] 3.7.1 - (Happy Path) Successfully enables a plugin from a collection.
- [x] 3.7.2 - (Happy Path) The `plugin enable` command successfully enables a valid plugin.
- [x] 3.7.3 - (Sad Path) The `plugin enable` command fails to enable an invalid plugin and reports validation errors.

### test/runners/e2e/plugin-disable.manifest.js
- [x] `plugin-disable.manifest.yaml`
- [x] 3.8.1 - (Happy Path) Successfully disables an enabled plugin.

### test/runners/e2e/plugin-validate.manifest.js
- [x] `plugin-validate.manifest.yaml`
- [x] 3.9.1 - (Happy Path) Successfully validates a well-formed plugin directory.
- [x] 3.9.2 - (Sad Path) Fails validation for a poorly-formed plugin directory.

### test/runners/e2e/collection-add.manifest.js
- [x] `collection-add.manifest.yaml`
- [x] 3.10.1 - (Happy Path) Successfully adds a collection from a git URL.
- [x] 3.10.2 - (Input Variation) Successfully adds a collection from a local directory path.
- [x] 3.10.3 - (Sad Path) Fails with a non-zero exit code when the source is invalid. (404 git repo)

### test/runners/e2e/collection-list.manifest.js
- [x] `collection-list.manifest.yaml`
- [x] 3.11.1 - (Happy Path) Correctly lists all added collections.

### test/runners/e2e/collection-remove.manifest.js
- [x] `collection-remove.manifest.yaml`
- [x] 3.12.1 - (Happy Path) Successfully removes an added collection.

### test/runners/e2e/collection-update.manifest.js
- [x] `collection-update.manifest.yaml`
- [x] 3.13.1 - (Happy Path) Successfully runs the update process on all collections.
- [x] 3.13.2 - (Key Option) Successfully runs the update process on a single named collection.
- [x] 3.14.1 - (Alias) The `update` alias successfully runs the collection update process.

### test/runners/e2e/global-flags.manifest.js
- [x] `global-flags.manifest.yaml`
- [x] 3.15.1 - The `--version` flag correctly displays the tool's version.
- [x] 3.15.2 - The `--help` flag correctly displays the help text.
- [x] 3.15.3 - (Sad Path) An unknown command fails with a non-zero exit code and an appropriate error message.

### <plugin remove> (new)
- [x] `plugin-remove.manifest.yaml`



