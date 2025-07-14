<!-- lint-skip-index -->
```
notroot@fedora:~/Build/md-to-pdf$ node scripts/trees/tree-explorer.js scripts/linting/ --count=lines
└── scripts
    └── linting
        ├── code
        │   ├── logging-lint.js               # 178 lines
        │   ├── remove-auto-doc.js            # 177 lines
        │   ├── standardize-js-line-one-all.js # 148 lines
        │   └── strip-trailing-whitespace.js  # 97 lines
        ├── config.yaml                       # 56 lines
        ├── docs
        │   ├── postman-helpers.js            # 107 lines
        │   ├── postman.js                    # 246 lines
        │   └── update-project-indices.js     # 214 lines
        ├── lint.js                           # 143 lines
        └── validators
            ├── mocha-path-validator.js       # 139 lines
            └── paths-js-validator.js         # 116 lines
```

---

```
 [0.]  Get everything green (tests + linters)
    ↓
[1.1]  Audit all linters with checklist
    ↓
[1.2]  Modernize/unify all linters
    ↓
 [2a]  Build/validate smokers (integration tests for linting suite)
    ↓
 [2b]  Automate path registry, meta-linter, etc.
    ↓
 [3a]  Complement orchestrator w/ central harness
    ↓
  [4]  Dream Board: API, dashboards, etc.
```

<!--
**Legends**
✔ = Complete
● = In Progress
○ = Open
× = Wontfix
‖ = Paused
★ = High-value
-->

### 1.1 Audit all linters with checklist

| Lints [ `scripts/linting/` ]  | La| Lb| Lc| Ld| Le| Lf| Lg| Lh| Lj| Lk| Ll| notes |
|-------------------------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:------|
| `code/logging-lint.js`        | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `code/remove-auto-doc.js`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `code/standardize-js-l..`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `code/strip-trailing-w..`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `config.yaml`                 | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `docs/postman-helpers.js`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `docs/postman.js`             | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `docs/update-project-i..`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `lint.js`                     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `validators/mocha-path..`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |
| `validators/paths-js-v..`     | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | .. |

### 1.2 Linter Commonalities

These are requirements that each "official" linter should ideally satisfy.

- [ ] **La** Internal pathing modernized to registry `@paths` model
- [ ] **Lb** Documents purpose and usage in (respective) `index.md`
- [ ] **Lc** Clear domain separation (code, docs, validators)
- [ ] **Ld** ★ Uses **unified linter config** `lint.yaml`
- [ ] **Le** Hardcoded variables removed and declared in the linter config.
- [ ] **Lf** Human-readable (`--pretty`) *implicitly*
- [ ] **Lg** Machine-readable (`--json`) *explicitly*
- [ ] **Lh** Universal CLI options: `--fix`, `--quiet`, `--debug`, `--force`
- [ ] **Li** Common boilerplate moved to `scripts/shared/lint-helpers.js`
- [ ] **Lj** Aggregates results/exit codes for harness
- [ ] **Lk** Serialized output is API-friendly
- [ ] **Ll** Batchable, state-preserving, `md-to-pdf` CLI smoke-test harness 

---

### 2. New & Updated Lints

Obsolescence of refactor scripts and birth of new lints. Can be done in parallel.

- [ ] **Salvage Refactor Jetsam.** From `scripts/refactor/`, decide which refactor scripts to part-out to lints.
  - *list goes here*
- [ ] Split `generate-help-checklist.js` into checklist updater and help validator.
  - [ ] `scripts/docs/generate-checklist.js`
  - [ ] `test/smoke/validate-help.js` ( not a linter, too slow )
- [ ] **Automated Smoke Testing.** construct validation harness to smoke-test `md-to-pdf`'s 
  state-preserving CLI options.
  - [ ] `test/smoke/validate-help.js` moved from `scripts/validators/validate-help.js`
  - [ ] `test/smoke/validate-plugins.js` ( `md-to-pdf plugin validate --all` )
  - [ ] `test/smoke/validate-config.js` ( `md-to-pdf config <options>` )
  - [ ] `test/smoke/validate-listing.js` ( `md-to-pdf collection list <options>`)
- [ ] **Evolve pathing linters into first-class validators.**
  - [ ] ★ `paths-js-validator.js`: validate `const { fooPath } = require('@paths');` for all `src/**/*.js`.
  - [ ] Prototype oath registry generator
  - [ ] `mocha-path-validator.js`: may feature-complete.


### 3. Centralized Linter Suite

Tasks that improve the health of the project and linting.  The "human" lints.

- [x] [shell] Restructure `scripts/linting/` into subdirectories by domain.
- [x] [shell] Move all helpers into their into `shared/`, or as sibling `*-helpers.js` if needed.
- [x] [code] Update orchestrator (`scripts/linting/lint.js`) to use the new structure.
- [ ] [docs] `scripts/refactor/`: Find historical scripts in your index (chore: find GitHub permalinks).
- [ ] [code] `scripts/refactor/`: Prune obsolete, one-off, and duplicate scripts.
- [ ] [code] `lint-harness.js`: Create a harness that: 
  - [ ] loads config
  - [ ] standardizes CLI options
  - [ ] aggregates results
  - [ ] makes it easy to add linters.
- [ ] [code] Write a “meta-linter” to audit linter configs for consistency.

### 4. Dream-board v0.11 .. v1.0
- [ ] Lay groundwork for an API layer on top of the CLI.
- [ ] Prototype engine features using the harness as a foundation.
- [ ] Explore exposing engine APIs for integration, automation, or external toolchains.



---

disposable checklist:


## **Linter Modernization Pass: Step 1**

### 1. **Validators**

- [x] Move patterns/ignores and IGNORED\_PATHS to `config.yaml` (unified config section for each validator)
- [x] Refactor CLI parsing and file finding to use shared helpers
- [x] Ensure all validators support `--json` output (if not already)
- [x] Add/expand CLI options: `--fix` (stub if N/A), `--quiet`, `--json`, `--debug`, `--force`
- [x] Return/print a summary object for harness aggregation

### 2. **Docs Linters**

- [ ] Move all patterns/ignores to `config.yaml`
- [ ] Refactor repetitive logic to helpers where possible
- [ ] Add `--json` output (summary object) for harness/CI integration
- [ ] Add/expand CLI options: `--fix`, `--quiet`, `--json`, `--debug`, `--force`
- [ ] Return/print a summary object for harness aggregation

### 3. **General**

- [ ] Update or add config sections in `config.yaml` for any new patterns/ignores/ignores
- [ ] Update index/librarian docs to reflect config changes
- [ ] Commit as a single, focused PR:  
  _“Modernize validators and docs linters: config-driven, helpers, JSON output, CLI options”_


