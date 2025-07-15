<!-- lint-skip-index -->

### 0. Audit and Parity Task Matrix

Task matrix for total feature parity. This makes more sense via `git s -w docs/linting-checklist.md`).

| Lints [ `scripts/linting/` ]   | La | Lb | Lc | Ld | Le | Lf | Lg | Lh | Li | Lj | Lk | Ll |
|--------------------------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `code/logging-lint.js`         | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/remove-auto-doc.js`      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/standardize-js-line-o..` | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `code/strip-trailing-whites..` | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `docs/postman-helpers.js`      | ✔  | ✔  | ✔  | ✔  | ✔  | -- | -- | -- | ✔  | -- | -- | -- |
| `docs/postman.js`              | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `docs/update-project-index...` | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `lint.js`                      | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | -- |
| `validators/mocha-path-vali..` | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |
| `validators/paths-js-valida..` | ✔  | ✔  | ✔  | ✔  | ✔  | ●  | ✔  | ✔  | ✔  | ✔  | ✔  | ✔  |

**Legend:**  ✔ = complete | ● = partial | × = missing | -- = not applicable

#### Notes

Nuances of the lints.
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

### 1. Linter Commonalities

Requirements that each "official" linter should ideally satisfy.
When all eight atomic lints satisfy an **L?**, we may check that item off.

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

For `--pretty` [**Lf**]: use ESLint's styles instead of our own.

---

### 2. New & Updated Lints

Obsolescence of refactor scripts and birth of new lints. Can all be done in parallel.

**Salvage Refactor Jetsam.** \
From `scripts/refactor/`, decide which refactor scripts to part-out to lints.
- [ ] Split `generate-help-checklist.js` into checklist updater and help validator.
  - [ ] **Checklist Tool.** `scripts/docs/generate-checklist.js`
  - [ ] **Help Validator.** `test/smoke/validate-help.js` ( not a linter, too slow )
- [ ] *--- additional refactor scripts go here ---*
- [ ] Find historical scripts in the index (chore: find **GitHub permalinks**).
- [ ] Prune obsolete, one-off, and duplicate scripts.
- [ ] Good-night `scripts/refactor/`

**Automated Smoke Testing.** \
Construct validation harness to smoke-test `md-to-pdf`'s state-preserving CLI options.
- [ ] `test/smoke/validate-help.js` moved from `scripts/validators/validate-help.js`
- [ ] `test/smoke/validate-plugins.js` ( `md-to-pdf plugin validate --all` )
- [ ] `test/smoke/validate-config.js` ( `md-to-pdf config <options>` )
- [ ] `test/smoke/validate-listing.js` ( `md-to-pdf collection list <options>`)

**Evolve pathing linters.** \
Enhance into first-class validators
- [ ] `paths-js-validator.js`: validate `const { fooPath } = require('@paths');` for all `src/**/*.js`.
- [ ] ★ Prototype path registry generator [ can double as anchor in `logger.debug() `]
- [x] `mocha-path-validator.js`: may be feature-complete.

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
- [ ] Aggregate results: collect and summarize pass/fail status for all steps
- [ ] Add support for `--config ` to load an alternate config file (*maybe*)

**Meta-Linter.** \
Validation and quality control.
- [ ] Validate config structure.
  - Missing required fields (`label`, `command` or `scriptPath`)
  - Conflicting flags (e.g. `quiet: true` + `json: true`)
  - Invalid paths (e.g. `!fs.existsSync`)
  - Duplicate or ambiguous labels
- [ ] Warn on unused linters or unreachable steps
- [ ] Optionally auto-fix or suggest corrections

### 4. Dream-board v0.11 .. v1.0

What are we working towards?

- [ ] Lay groundwork for an API layer on top of the CLI.
- [ ] Prototype engine features using the harness as a foundation.
- [ ] Explore exposing engine APIs for integration, automation, or external toolchains.
