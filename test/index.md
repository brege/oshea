## Test Harness and QA Analytics

This directory contains the testing and quality assurance infrastructure for `oshea`, including test execution, analytics, and intelligent monitoring systems.

### Testing Paradigm -- Manifest/Factory Harness

- **Manifest-Driven:** \
  Test scenarios are declaratively defined in manifest files (e.g., `*.manifest.yaml`),
  auditable, and extensible.

- **Factory Pattern:** \
  The test runner dynamically instantiates test cases from these manifests, applying stubs/mocks and assertions in a standardized way.

- **Single Source of Truth:** \
  Reduced duplication between "atomic" and "harness" test means every logical scenario is mapped in exactly one place.

### Directory Structure

```
test/
├── runners/                      # Test execution infrastructure
│   ├── end-to-end/               # End-to-end test scenarios
│   │   ├── cli/                  # E2E tests of src/cli/    (level 3)
│   │   ├── validators/           # Validation of plugins/
│   │   ├── workflows/            # Lifecycles and demos     (level 4)
│   │   └── e2e-*.js              # Test environment setup
│   ├── integration/              # Integration test suites
│   │   ├── <module>/             # src/<module>/            (level 1, 2)
│   │   ├── shared/               # Helpers and utilities
│   │   └── setup.sh              # Test environment setup
│   ├── linting/                  # Code quality validation
│   ├── fixtures/                 # Shared test data
│   └── shared/                   # Common utilities
├── analytics/                    # QA intelligence and monitoring
│   ├── qa-analytics.js           # Test brittleness analysis
│   ├── log-failures-reporter.js  # Enhanced test reporting
│   ├── test-watcher.js           # Smart test selection
│   └── sample-test-results.json  # Reference data format
├── config/                       # Test metadata and classification
│   └── metadata-level-*.yaml     # Test registry and specs
└── archive/                      # Historical documentation and deprecated tools
    ├── (docs/.. scripts/)        # Legacy QA tools 
    └── index.md                  # Archive index

```
See [`archive/index.md`](archive/index.md) for historical documentation.


### Testing Levels & Coverage Strategy

Tests are organized by increasing scope and integration complexity:

- **Level 0** (Meta): Discrete validation units--linters, parsers, and rule-based checks
- **Level 1**: Module integration scenarios  
- **Level 2**: Subsystem integration scenarios
- **Level 3**: End-to-end CLI scenarios
- **Level 4**: Full lifecycle workflows

Traditional unit tests are intentionally minimal. CLI applications derive more value from integration-level testing, as meaningful behavior occurs at module boundaries, file system operations, and cross-system coordination rather than isolated function calls.

### Testing Framework

The project uses [Mocha](https://mochajs.org/) as its test runner with a hybrid architecture combining traditional integration tests and manifest-driven end-to-end tests. A centralized configuration file, [`.mocharc.js`](../.mocharc.js), defines test groups and paths, making the suite flexible and manageable.

**YAML Manifest System**: End-to-end tests use declarative YAML manifests that define test scenarios, enabling user-extensible workflows and efficient batch processing of test cases.

#### Running Tests

Tests can be executed in a variety of ways to target specific groups, levels, or specific test files.

  * **Run all tests:**
    ```bash
    npm test
    ```
  * **Run a specific group** (defined in [`.mocharc.js`](../.mocharc.js)):
    ```bash
    npm test -- --group level3
    ```
  * **Run a specific test file** by `grep`ping for its test ID:
    ```bash
    npm test -- --grep "3.5.1"
    ```
  * **Run a single test file** by path (integration tests):
    ```bash
    npm test -- 'test/runners/integration/config/config-resolver.test.js'
    ```
  * **Run a single test file** by path (end-to-end tests):
    ```bash
    node test/runners/end-to-end/e2e-runner.js \
         test/runners/end-to-end/cli/config.manifest.yaml \
         # --show   # Show test output 
         # --debug  # Show intermediate steps
    ```

### QA Analytics and Intelligence

The analytics system provides intelligent insights into test performance, brittleness, and historical patterns to optimize development workflows.

**Core Analytics Tools:**

- **[`qa-analytics.js`](analytics/qa-analytics.js)** - Analyzes test brittleness and failure patterns
  ```bash
  node test/analytics/qa-analytics.js [--limit 20] [--min-runs 5]
  ```

- **[`test-watcher.js`](analytics/test-watcher.js)** - Smart test selection based on source changes
  ```bash
  node test/analytics/test-watcher.js
  ```

- **[`log-failures-reporter.js`](analytics/log-failures-reporter.js)** - Enhanced Mocha reporter tracking test history

- **[`run-last-fails.js`](analytics/run-last-fails.js)** - Re-run previously failed tests
  ```bash
  npm run test:last-fails  # Re-run previously failed tests
  ```

**Data Storage**

Test analytics data is stored in `~/.local/share/oshea/test-analytics/test-results.json` using an enhanced format that tracks:
- Success/failure counts per test
- Volatility classification (stable/flaky/unstable)
- Temporal tracking (first seen, last run)
- Performance metrics (duration, error patterns)

**Test Metadata**

The `config/metadata-level-*.yaml` files provide static test classification including:
- Test levels, ranks, and groups
- Source file mappings
- Command specifications
- Documentation references

---

## Testing & Quality Assurance

*Documentation that details the project's testing framework, strategy, and metrics that define project quality.*

### Strategy & Process

* [**Test Generation Priority Order**](archive/docs/test-generation-priority-order.md):
  Explains the ranked, multi-level testing strategy and the module priority.
* [**Next-Generation Testing Framework**](../docs/v0.11/next-generation-testing.md):
  Intelligent test execution with volatility tracking and dependency analysis.
* [**Next-Generation Implementation Progress**](runners/next-generation-testing-part-2.md):
  Implementation status and architectural improvements completed in the YAML manifest system.

### Test Metadata Registry

Current test specifications are defined in structured YAML metadata.

* [Level 1 Tests](config/metadata-level-1.yaml): Module integration scenarios
* [Level 2 Tests](config/metadata-level-2.yaml): Subsystem integration scenarios  
* [Level 3 Tests](config/metadata-level-3.yaml): End-to-End CLI scenarios
* [Level 4 Tests](config/metadata-level-4.yaml): End-to-End lifecycle scenarios
* [Level M0 Tests](config/metadata-level-m0.yaml): Unit tests for linters and validators

### Historical Documentation

All formation-era documentation and deprecated tools are preserved in the archive.

* [Archive Index](archive/index.md): Complete historical documentation
* [Legacy QA Tools](archive/scripts/): Deprecated analysis scripts  
* [Original Checklists](archive/docs/): Markdown-based test checklists

---

## Uncategorized Test Scripts
<!-- uncategorized-start -->
<!-- uncategorized-end -->
