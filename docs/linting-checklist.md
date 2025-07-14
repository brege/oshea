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
★ = High-value
-->

### 1.1 Audit and Parity Task Matrix

| Lints [ `scripts/linting/` ]   | La | Lb | Lc | Ld | Le | Lf | Lg | Lh | Li | Lj | Lk | Ll |  
|--------------------------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|  
| `code/logging-lint.js`         | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `code/remove-auto-doc.js`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `code/standardize-js-l..`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `code/strip-trailing-w..`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `docs/postman-helpers.js`      | ✔  | ✔  | ✔  | ✔  | ✔  | N/A| N/A| N/A| ✔  | N/A| N/A| N/A|  
| `docs/postman.js`              | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `docs/update-project-i..`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `lint.js`                      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | N/A|  
| `validators/mocha-path..`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  
| `validators/paths-js-v..`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |  

**Legend:**  ✔ = complete | ● = partial | × = missing | N/A = not applicable

### Notes

1.  **`code/logging-lint.js`**:                  No autofix (by design)
2.  **`code/remove-auto-doc.js`**:               Fully modern
3.  **`code/standardize-js-line-one-all.js`**:   Patterns/ignores not in config
4.  **`code/strip-trailing-whitespace.js`**:     Patterns/ignores not in config
5.  **`docs/postman-helpers.js`**:               Helpers only
6.  **`docs/postman.js`**:                       Now fully modern, JSON, config, helpers, CLI
7.  **`docs/update-project-indices.js`**:        Now fully modern, JSON, config, helpers, CLI
8.  **`lint.js`**:                               Orchestrator, not a linter
9.  **`validators/mocha-path-validator.js`**:    Fully modern
10. **`validators/paths-js-validator.js`**:      Fully modern

### 1.2 Linter Commonalities

These are requirements that each "official" linter should ideally satisfy.
When all eight atomic lints satisfy a **L?**, we may check that item off.

- [x] **La** Internal pathing modernized to registry `@paths` model
- [x] **Lb** Documents purpose and usage in (respective) `index.md`
- [x] **Lc** Clear domain separation (code, docs, validators)
- [x] **Ld** ★ Uses **unified linter config** `lint.yaml`
- [x] **Le** Hardcoded variables removed and declared in the linter config.
- [ ] **Lf** Human-readable (`--pretty`) *implicitly*
- [x] **Lg** Machine-readable (`--json`) *explicitly*
- [x] **Lh** Universal CLI options: `--fix`, `--quiet`, `--debug`, `--force`
- [x] **Li** Common boilerplate moved to `scripts/shared/lint-helpers.js`
- [x] **Lj** Aggregates results/exit codes for harness
- [x] **Lk** Serialized output is API-friendly
- [x] **Ll** Batchable, state-preserving, `md-to-pdf` CLI smoke-test harness 

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
  - [ ] Prototype path registry generator
  - [ ] `mocha-path-validator.js`: may be feature-complete.

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

