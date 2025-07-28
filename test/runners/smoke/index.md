## Unified Smoke Test Framework

### Overview

The smoke test directory is being developed as a "sanity-check zone" 
to verify that all functionality works as expected across different scenarios and contexts.

We already have a mocha test suite that covers module and subsystem integration and end-to-end testing.
The goal here is to make a set of tests that users will understand.

1. **Visual Validation Tests** [ `smoke-tests.yaml` + `smoke-test-runner.js` ]

   This is CLI node study that runs every state-preserving command and if the output finishes without error. These can also surface `--help` text, validate all bundled plugins, suss out empty-state output vs. full-fat content, and build an overview of all output formats used by the CLI.

2. **Workflow Tests** [ `workflow-tests.yaml` + `workflow-test-runner.js` ]

   These are sequential test blocks. For example: **plugin lifecycle**
   
   **create → add → disable → enable → remove**
   
   Environment isolation with workspace management is achieved app-side through context switching via `--coll-root` or configuration switching via `--config`.

Using YAML allows for tagging and organization of these tests. It makes the manifest trim, human-readable, easy to see what commands are ran, and have the major advantage that the format is stackable and self-documenting. 


| ● | **Label** | **Command** | **Description** | 
|:-:|:--------- |:----------- |:--------------- |
| ✓ | `show`    | `--show`    | `true` to display the output of the commands themselves |
| ○ | `skip`    | `--skip`    | `true` to skip the `test_id` or `tag` |
| ○ |           | `--only`    | opposite of `skip` |
| ○ | `order`   | `--order`   | `1` or `2`  (needs to change) |
| ○ | `test_id` | `--grep`    | similar to mocha's `--grep` |
| ○ | `tags`    | `--tag`     | run blocks by tag |
| ○ | `yaml`    | `--yaml`    | run one or more YAML manifest files |

---

### Advanced Applications

#### Linter Algebra

Once the unified framework is stable, this module will enable systematic testing of linter properties through permutation:

- **Commutative properties**: Does `linter A → linter B` produce the same result as `linter B → linter A`?
- **Idempotent properties**: Does running a linter twice produce the same result as running it once?
- **Associative properties**: For linter chains, does grouping matter?
- **Identity properties**: Are there linter combinations that effectively cancel out?

We need testing of the linters in case they ever get integrated into plugin validation.

#### Sequence Composition

The framework will support composing complex test sequences from simpler building blocks, enabling:
- Modular test construction
- Reusable test patterns
- Systematic exploration of command combinations
- Regression detection through baseline comparisons

---

### Task Matrix
<!-- lint-disable postman -->
| ● | Task | Description                                        |
|:-:|:-----|:---------------------------------------------------|
| ✓ |      | create test harness (`test-harness.js`)            |
| ✓ |      | environment isolation with `TestWorkspace` class   |
| ✓ |      | shared validation and execution functions          |
| ○ |      | master test runner `unified-smoke-runner.js`       |
| ✓ |      | add `--show` mode support, with colors             |
| ○ |      | support YAML-level `show: true/false` in config    |
| ○ |      | sequence selection (run by name/number)            |
| ○ |      | command composition capabilities                   |
| ○ |      | regression detection                               |
| ○ |      | performance timing for sequence optimization       |
| ○ |      | test pattern templates                             |
| ○ |      | linter permutation testing                         |
| ○ |      | algebraic property validation                      |
| ○ |      | mutation testing                                   |
<!-- lint-enable postman -->
