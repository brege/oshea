<!-- lint-skip-index -->

This document will be renamed and better formatted.  For now, I'm taking inventory of outstanding checklist items from

1. [`archive/v0.9/dream-board-v0.9.md`](archive/v0.9/dream-board-v0.9.md)
2. [`archive/v0.10/rc-checklist.md`](archive/v0.10/rc-checklist.md)
3. [`archive/v0.10/linting-checklist.md`](archive/v0.10/linting-checklist.md)

---

### General

- [ ] update README.md, expand scripts/linting/index.md (like test/index.md does)
- [ ] merge develop into main
- [ ] rename project and string replace 'md-to-pdf' with my top-secret name
- [ ] have fun building more plugins with ai

---

### Tests

- [x] make `test/` pathing registry compliant.
- [x] smoke test to CI
- [x] pay debt in plugin validate
- [ ] add level4 tests for walkthroughs

- [ ] `test/linting/integration` & linting dummy test suite to complement `test/linting/unit`
  - this requires a permuting grouped linters, like `--only code --only docs`, and detecting
    if (linterA -> linterB) `--fix` = (linterB -> linterA) `--fix`,
    i.e. commutativity: [A, B] = 0 on-write.

### Linting

- [ ] linter fine-tuning via config file
- [ ] change the `severity` of a linter based on branch:
    ```yaml
    severity-bump:
      develop: 0      # no change
      main: 1         # bump all warnings to errors
    ```
- [x] add aliases for and/or groups of linters:
    ```yaml
    groups:
      code: ["remove-ws", "standardize-line-one", .. ]
    remove-ws:
      alias: ["ws", "whitespace"]
      group: ["code"]
    ```
    and via `--only code` or `--skip docs`.

**Naming standardization.**
- [x] hyphenate all JavaScript files for consistency (kebab-case)
- [x] make ESlint rule to enforce camelCase for variable/function names

**Validate config structure.**
- [ ] missing required fields (`label`, `command`)
- [ ] invalid paths (e.g. `!fs.existsSync`)
- [ ] duplicate or ambiguous labels
- [ ] warn on unused lints or unreachable steps

**Linting reporting.**
- [ ] fix current implementation of reporter


