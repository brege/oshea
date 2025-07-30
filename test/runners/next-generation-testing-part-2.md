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
- [ ] Unify [`smoke-test-runner.js`](smoke/smoke-test-runner.js) and [`workflow-test-runner.js`](smoke/workflow-test-runner.js)

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

---

## Phase 4: E2E Porting (Next-gen Testing)

- [ ] Determine the logical order in which to port old E2E tests into the new system
- [ ] Define feature parity between old and new E2E test processes
- [ ] Port old E2E tests into the new system
  - [ ] Ported ... into the new system at ...
  - [ ] Ported ... into the new system at ...

## Phase 5: Unify manifests with documentation

- [ ] `test/config/metadata-level-3.yaml` combine into a complete `<level-3>.yaml` file
- [ ] `test/config/metadata-level-4.yaml` combine into a complete `<level-4>.yaml` file
