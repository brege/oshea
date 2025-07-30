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
- [x] Eliminate function duplication - Split out [`smoke-helpers.js`](smoke/smoke-helpers.js)
- [x] Unified formatting - both runners should use the same formatter

**Mocha integration of smoke-like runners**
- [x] Test unified formatting and functionality - Ensure mocha integration works
- [x] Fix coffeecup wrapper - Separate data stream from display logic  
- [x] Test coffeecup - Ensure mocha integration works (on the workflow-pilot) 

**Unify smoke-like runners**
- [x] Extract special showMode formatting
- [x] Fix overbearing header spamm; color execution command
- [x] Rename `workflow-test-formatter.js` to `yaml-test-formatter.js`
- [x] Remove `smoke-test-formatter.js`
- [x] Rename `smoke-helpers.js` to `yaml-test-helpers.js`
- [x] Rename `workflow-coffeecup.test.js` to `yaml-mocha.test.js`
- [x] Re-generate pathing (name changes)
- [x] Unify [`smoke-test-runner.js`](smoke/smoke-test-runner.js) and [`workflow-test-runner.js`](smoke/workflow-test-runner.js)
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
- [ ] Ensure `--grep` quietly passes through unmatched files (during YAML-globbing)
- [x] Remove old runner files that are now redundant
- [ ] Remove console-log debt completely. Mostly: `yaml-test-*.js`
- [ ] Clean up all relative paths ***before phase 3*** 
- [ ] Ensure all `test_id`'s are displayed in Mocha output

---

## Phase 3: Restructure (Low Priority)

- [ ] Tree restructure  - Reorg test structure to mirror source structure
- [ ] Update path registry - After files move  

**Reflection Tree**
```
src/                                test/
├── cli/                            └── runners/
│   ├── commands/                       ├── e2e/     
│   │   ├── collection/                 │   ├── collection/
│   │   │   ├── add.command.js          │   │   ├── collection-add.manifest.js
│   │   │   ├── list.command.js         │   │   ├── collection-list.manifest.js
│   │   │   ├── remove.command.js       │   │   ├── collection-remove.manifest.js
│   │   │   └── update.command.js       │   │   └── collection-update.manifest.js
│   │   ├── config.command.js           │   ├── config.manifest.js (replace w/ smoke-tests.yaml)
│   │   ├── convert.command.js          │   ├── convert.manifest.js (to transition to yaml)
│   │   ├── generate.command.js         │   ├── generate.manifest.js (to transition to yaml)
│   │   ├── plugin/                     │   ├── plugin/
│   │   │   ├── add.command.js          │   │   ├── plugin-add.manifest.js
│   │   │   ├── create.command.js       │   │   ├── plugin-create.manifest.js
│   │   │   ├── disable.command.js      │   │   ├── plugin-disable.manifest.js
│   │   │   ├── enable.command.js       │   │   ├── plugin-enable.manifest.js
│   │   │   ├── help.command.js         │   │   │
│   │   │   ├── list.command.js         │   │   ├── plugin-list.manifest.js
│   │   │   ├── remove.command.js       │   │   ├── plugin-remove.manifest.js (missing)
│   │   │   └── validate.command.js     │   │   └── plugin-validate.manifest.js
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
- [ ] Rename `plugin-*.manifest.js` to `plugin/*.manifest.js`
- [ ] Remove `test/runners/smoke/` after re-organizing test-tree

**Neo-test YAML's** \
These should be at the same base as the old manifests.  This means we should rename to match the structure `plugin/*.manifest.js <--> plugin/*.manifest.yaml`, breaking up the YAMLs for the time being.

**App-side consistency**
- [ ] Move all of `src/cli/commands` into `src/cli` (this way `src/cli/ <--> test/runners/e2e/`)
- [ ] `mv src/cli/get-help.js src/plugins/plugin-help.js` (this only applies to plugins help-text)
- [ ] `mv src/plugins/validator.js src/plugins/plugin-validator.js` (consistency)
- [ ] `mv src/cli/config-display.js src/utils/formatters/config-formatter.js` (consistency)
- [ ] `mv src/utils/formatters/*-formatter.js src/utile/formatters/*.formatter.js` (good/bad idea?)

This phase is all shell and path registry work. Try not to get distracted.

---

## Phase 4: E2E Porting (Next-gen Testing)

- [ ] Determine the logical order in which to port old E2E tests into the new system
- [ ] Define feature parity between old and new E2E test processes
- [ ] Port old E2E tests into the new system
  - [ ] Ported ... into the new system at ...
  - [ ] Ported ... into the new system at ...
- [ ] rename `yaml-*.js` files to `e2e-*.js` files, as old tests are removed and don't conflict with new E2E test files 

## Phase 5: Unify manifests with documentation

- [ ] `test/config/metadata-level-3.yaml` combine into a complete `<level-3>.yaml` file
- [ ] `test/config/metadata-level-4.yaml` combine into a complete `<level-4>.yaml` file
