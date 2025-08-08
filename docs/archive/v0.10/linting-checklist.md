<!-- lint-skip-file postman -->

### 0. Audit and Parity Task Matrix

Task matrix for total feature parity. This makes more sense via `git s -w docs/linting-checklist.md`).

| Lints [ `scripts/linting/` ]   | La | Lb | Lc | Ld | Le | Lf | Lg | Lh | Li | Lj | Lk | Ll |
|--------------------------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `code/logging-lint.js`         | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/remove-jsdoc.js`         | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/standardize-js-line-o..` | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/strip-trailing-whites..` | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `docs/postman-helpers.js`      | ✔  | ✔  | ✔  | ✔  | ✔  | -- | -- | -- | ✔  | -- | -- | -- |
| `docs/postman.js`              | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `docs/update-project-index...` | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `lint.js`                      | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | -- |
| `validators/mocha-path-vali..` | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `validators/paths-js-valida..` | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |

**Legend:**  ✔ = complete | ● = partial | × = missing | -- = not applicable

#### Notes

Nuances of the lints.
1.  **`code/logging-lint.js`**:                  No autofix (by design)
2.  **`code/remove-jsdoc.js`**:                  Fully modern
3.  **`code/standardize-js-line-one-all.js`**:   Patterns/ignores not in config
4.  **`code/strip-trailing-whitespace.js`**:     Patterns/ignores not in config
5.  **`docs/postman-helpers.js`**:               Helpers only
6.  **`docs/postman.js`**:                       Now fully modern, JSON, config, helpers, CLI
7.  **`docs/update-project-indices.js`**:        Now fully modern, JSON, config, helpers, CLI
8.  **`lint.js`**:                               Orchestrator, not a linter
9.  **`validators/mocha-path-validator.js`**:    Fully modern
10. **`validators/paths-js-validator.js`**:      Fully modern

---

### 1. Linter Commonalities

Requirements that each "official" linter should ideally satisfy.
When all eight atomic lints satisfy an **L?**, we may check that item off.

- [x] **La** Internal pathing modernized to registry `@paths` model
- [x] **Lb** Documents purpose and usage in (respective) `index.md`
- [x] **Lc** Clear domain separation (code, docs, validators)
- [x] **Ld** ★ Uses **unified linter config** `lint.yaml`
- [x] **Le** Hardcoded variables removed and declared in the linter config.
- [x] **Lf** Human-readable (`--pretty`) *implicitly*
- [x] **Lg** Machine-readable (`--json`) *explicitly*
- [x] **Lh** Universal CLI options: `--fix`, `--quiet`, `--debug`, `--force`
- [x] **Li** Common boilerplate moved to `scripts/shared/lint-helpers.js`
- [x] **Lj** Aggregates results/exit codes for harness
- [x] **Lk** Serialized output is API-friendly
- [x] **Ll** Batchable, state-preserving, `md-to-pdf` CLI smoke-test harness 

For `--pretty` [**Lf**]: use ESLint's styles instead of our own.

---

### 2. New & Updated Lints

Obsolescence of refactor scripts and birth of new lints. Can all be done in parallel.

**Salvage Refactor Jetsam.** \
From `scripts/refactor/`, decide which refactor scripts to part-out to lints.
- [x] Split `generate-help-checklist.js` into checklist updater and help validator.
  - [x] **Checklist Tool.** `scripts/docs/generate-checklist.js`
  - [x] **Help Validator.** `test/smoke/validate-help.js` [ not a linter, too slow ]
- [x] Find historical scripts in the index (chore: find **GitHub permalinks**).
- [x] Prune obsolete, one-off, and duplicate scripts.
- [x] Good-night `scripts/refactor/`

**Automated Smoke Testing.** \
Construct validation harness to smoke-test `md-to-pdf`'s state-preserving CLI options.
- [x] `test/smoke/validate-app-help.js`         [ `scripts/validators/validate-help.js` ]
- [x] `test/smoke/validate-bundled-plugins.js`  [ `md-to-pdf plugin validate --all` ]
- [x] `test/smoke/validate-app-config.js`       [ `md-to-pdf config <options>` ]
- [x] `test/smoke/validate-plugin-list.js`      [ `md-to-pdf plugin list <options>` ]

**Evolve pathing linters.** \
Enhance into first-class validators
- [x] `paths-js-validator.js`: validate `const { fooPath } = require('@paths');` for all `src/**/*.js`.
- [x] ★ Prototype path registry generator [ can double as anchor in `logger.debug() `]
- [x] Find unused entries (eslint does not do this for us)
- [x] `mocha-path-validator.js`: may be feature-complete.

**Add new config options.**
- [ ] Change the `severity` of a linter based on branch:
    ```yaml
    severity-bump:
      develop: 0      # no change
      main: 1         # bump all warnings to errors
    ```
- [x] Add aliases for and/or groups of linters:
    ```yaml
    groups:
      code: ["remove-ws", "standardize-line-one", .. ]
    remove-ws:
      alias: ["ws", "whitespace"]
      group: ["code"]
    ```
    and via `--only code` or `--skip docs`.

**Testing of the lints.**
- [ ] Build a dummy suite as a test fixture to reliably test lints.

---

### 3. Centralized Linting Infrastructure

Tasks that improve the health of the project and linting.  The "human" lints.

**Housekeeping** \
Foundation and structural reorganization.
- [x] Restructure `scripts/linting/` into subdirectories by domain
- [x] Move all helpers into `shared/` or sibling `*-helpers.js`
- [x] Update `lint.js` to use the new reorganized structure
- [x] Unify all linter config into `config.yaml`

**Harness Build-out** \
Core functionality--*does it lint?*
- [x] Load config from YAML
- [x] Standardize CLI flags: `--fix`, `--quiet`, `--debug`, `--json`, `--force`
- [x] Make it easy to add new lints
- [x] Declaratively set `fix: true`, `quiet: true`, etc. in `config.yaml`
- [x] Allow per-step overrides of flags and config options

**Harness Sugar** \
Ergonomics and user-friendliness.
- [x] `--only`: limit to run a specific step
- [x] Add aliases like `--remove-ws`, `--eslint`, etc.
- [x] `--config`: print the full config or a specific step (in YAML)
- [x] `--config --json`: print `--config` output as JSON
- [x] `--list`: print all available steps (labels), optionally filtered
- [x] `--dry-run`: show what would run without executing
- [x] `--skip `: skip a specific step by label or alias
- [x] Aggregate results: collect and summarize pass/fail as a report [ *partially implemented* ]

**Meta-Linter.** \
Validation and quality control.
- [ ] Validate config structure
  - Missing required fields (`label`, `command` or `scriptPath`)
  - Conflicting flags (e.g. `quiet: true` + `json: true`)
  - Invalid paths (e.g. `!fs.existsSync`)
  - Duplicate or ambiguous labels
- [ ] Warn on unused lints or unreachable steps

---

### 4. Dream-board v0.11 .. v1.0

What are we working towards?

- [ ] Lay groundwork for an API layer on top of the CLI.
- [ ] Prototype engine features using the harness as a foundation.
- [ ] Explore exposing engine APIs for integration, automation, or external toolchains.

---

### Appendix -- Housekeeping Refactor Scripts

```
node scripts/trees/tree-explorer.js scripts/linting/ scripts/docs/ scripts/shared/ scripts/refactor/ --count=lines
└── scripts
    ├── docs
    │   ├── generate-help-checklist.js        # [x] extract to `--help` validator; remove updater
    │   └── generate-toc.js                   # [x] keep as is
    ├── linting
    │   ├── code
    │   │   ├── logging-lint.js               #  - 
    │   │   ├── no-relative-paths.js          # [x] **NEW** [ combines ideas from `refactor/@paths` ]
    │   │   ├── remove-jsdoc.js               #  - 
    │   │   ├── standardize-js-line-one-all.. #  -
    │   │   └── strip-trailing-whitespace.js  #  -
    │   ├── config.yaml                       #  -
    │   ├── docs
    │   │   ├── postman-helpers.js            #  -
    │   │   ├── postman.js                    #  -
    │   │   └── update-project-indices.js     #  -
    │   ├── lint-harness.js                   # [x] move [ to `../linting/lib` ]
    │   ├── lint.js                           #  - 
    │   └── validators
    │       ├── mocha-path-validator.js       #  - 
    │       ├── paths-js-validator.js         #  - 
    │       └── paths-usage-validator.js      # [x] **NEW**
    ├── refactor                              # [X] **`scripts/refactor/` has been removed**
    │   ├── @paths
    │   │   ├── pathing\_rejects.txt          # [x] remove
    │   │   ├── probe
    │   │   │   ├── probe-require-and-path.js # [x] del
    │   │   │   ├── require-classifier.js     # [x] del [ parted for `linting/code/no-r..` ]
    │   │   │   └── scan-path-usage.js        # [x] del
    │   │   ├── replace-src-paths.md          # [x] archive
    │   │   ├── replace-test-paths.md         # [x] archive
    │   │   ├── replace
    │   │   │   ├── replace-default-require.. # [x] del
    │   │   │   └── replace-pattern.js        # [x] del
    │   │   └── utils
    │   │       └── require-taxonomy-list.js  # [x] del
    │   ├── fix-require-paths
    │   │   ├── config.ini                    # [x] del
    │   │   ├── progress.md                   # [x] archive
    │   │   ├── replace-requires.js           # [x] del
    │   │   ├── require-catalogue.js          # [x] del
    │   │   └── require-catalogue.json        # [x] del
    │   └── validators
    │       └── require-path-validator.sh     # [x] del
    └── shared
        ├── comment-surfacer.js               # [x] combine with emoji tool [ `docs/remove-litter.js` ]
        ├── file-helpers.js                   # stay
        ├── formatters.js                     # [x] move [ to `../linting/lib` ]
        ├── lint-helpers.js                   # [x] move [ to `../linting/lib` ]
        └── output-adapter.js                 # [x] del
```
