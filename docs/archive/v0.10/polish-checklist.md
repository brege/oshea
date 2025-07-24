## Polish & Coverage Checklist

This checklist is a running inventory as I clean up, standardize, and validate the codebase and linting harness.
Previous checklist/roadmap documents:

1. [`archive/v0.9/dream-board-v0.9.md`](archive/v0.9/dream-board-v0.9.md)
2. [`archive/v0.10/rc-checklist.md`](archive/v0.10/rc-checklist.md)
3. [`archive/v0.10/linting-checklist.md`](archive/v0.10/linting-checklist.md)

---

### General

- [x] Update `README.md`; expand [`scripts/linting/index.md`](../scripts/linting/index.md) (like `test/index.md`)
- [x] Merge `develop` into `main`
- [ ] Rename project and string-replace `md-to-pdf` with new product name
- [ ] Build more plugins (and have fun)

---

### Tests

- [x] Make `test/` pathing registry compliant
- [x] Smoke test runs in CI
- [x] Pay tech debt in plugin validation
- [ ] Add level 4 tests for walkthroughs
- [ ] Create `test/linting/integration`. Requires: 
  - dummy kit for code, docs
  - permuting lints algebraically like `remove-ws ➜ logger ➜ jsdoc` =?= `jsdoc ➜ remove-ws ➜ logger`?
  - idempotency `remove-ws ➜ remove-ws` =?= `remove-ws`?

---

### Linting Framework

- [x] **Replace all linter scripts' `console.*` logging with the centralized logger**

#### Config and Rules

- [ ] Fine-tune each linter via config file
- [ ] Change linter severity based on branch (`severity-bump`)
    - example:
      ```yaml
      severity-bump:
        develop: 0      # no change
        main: 1         # bump all warnings to errors
      ```
- [x] Add alias/group options for linters (`groups:`)
- [x] Enforce camelCase for var/function names in ESlint
- [x] Hyphenate all JS filenames for consistency

#### Lint Config Schema Validation

- [ ] Check for missing required fields (`label`, `command`)
- [ ] Detect invalid paths (e.g. `!fs.existsSync`)
- [ ] Catch duplicate or ambiguous labels
- [ ] Warn on unused lints/unreachable steps

#### Linting Rules

- [ ] Unified skipping logic, using alias/groups as tags:
  ``` js
  // lint-disable-next-line logging
  console.log('hello')

  y = x + 1 // lint-disable-line code
  ```
  
  ```html
  <!-- lint-disable-begin postman -->
  | uncooperating/table.js | AST should be skipping this, yet it's not |  
  <!-- lint-disable-end postman -->
  ```

  ```yaml
  # .lintignore file to skip a directory
  postman
  code
  ```

  ```js
  // lint-skip-file no-relative-paths logging 
  console.log('hello')
  ```

  Each linter is currently implementing its own skipping logic, making it difficult to find
  and turn off skipping logic during debugging. We should abstract this into [`lint-helpers.js`](../scripts/linting/lib/lint-helpers.js)
  for central management.
  

#### Linting Reporting

- [x] Fix reporter implementation

---

### Linting CI Matrix

[**`scripts/linting/linting-config.yaml`**](../scripts/linting/linting-config.yaml) 

In general, **total coverage** means the following:
- **`targets: ["."]`**
- **`excludes: []`**

*with exception (see below)*.

**Legend:** | 
✔ = Complete |
○ = Partially Complete

<!-- lint-disable-links -->

| Lint                   | ✔ | Coverage Targets               | ✔ | Excludes                        |
|:-----------------------|:-:|:-------------------------------|:-:|:--------------------------------|
| **code**               |   |                                |   |                                 |
| `remove-jsdoc`         | ✔ | `.` for `.js`                  | ✔ | none                            |
| `logging`              | ✔ | `.` for `.js`                  | ✔ | none                            | 
| `standardize-line-one` | ✔ | `.` for `.js`                  | ✔ | none                            |
| `remove-ws`            | ✔ | `.` for `!.md`                 | ✔ | none                            |
| `no-relative-paths`    | ✔ | `.` for `.js`                  | ✔ | `paths/`                        |
| **validation**         |   |                                |   |                                 |
| `validate-mocha`       | ✔ | `.mocharc.js`                  | ✔ | none                            |
| **docs**               |   |                                |   |                                 |
| `find-litter`          | ✔ | `.` for `.*`                   | ✔ | none                            |
| `update-indices`       | ✔ | `.` for `.md`                  | ✔ | plugin's `{index,*-example}.md` |
| `doc-links`            | ✔ | `.` for `.md, .js`             | ✔ | other `index.md`'s              |
| **third-party**        |   |                                |   |                                 |
| `eslint`               | ✔ | `.` for `.*`                   | ✔ |                                 |

---

**Main issues.**
- [ ] [**logging**] **`scripts/linting`** replace all `console.*` logging with the centrallogger
- [x] [**postman**] **`README.md`** has dozens of broken links
- [x] [**librarian**] does **`README.md`** need to "index" all ALLCAPS.md files (`CONTRIBUTING.md`, `LICENSE`)?  Answer: **No**.
<!-- lint-enable-links -->

---

**Always excluded from all linting.**
- `node_modules/`
- `.git/`
- `package*.json`
- `docs/archive/`
- `assets/`

**The filetypes that are defaults.**
``` yaml
targets: ['.js', '.json', '.md', '.sh', '.yaml', '.txt']
```
