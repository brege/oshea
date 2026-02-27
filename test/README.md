# Testing & QA

This directory contains the testing and Quality Assurance infrastructure for **oshea**, including test execution, analytics, and intelligent monitoring systems. Test scenarios are defined in YAML manifests `*.manifest.yaml`, while the test runner dynamically instantiates test cases from manifests, applying stubs, mocks, and asserts.

## Depth and Coverage

Specifications are defined in structured YAML metadata where tests are organized by increasing scope and integration complexity.

* [Level 1 Tests](config/metadata-level-1.yaml): Module integration scenarios
* [Level 2 Tests](config/metadata-level-2.yaml): Subsystem integration scenarios  
* [Level 3 Tests](config/metadata-level-3.yaml): End-to-End CLI scenarios
* [Level 4 Tests](config/metadata-level-4.yaml): End-to-End lifecycle scenarios

CLI applications derive more value from integration-level testing, as meaningful behavior occurs at module boundaries, file system operations, and cross-system coordination rather than isolated function calls.

Together with [`.mocharc.js`](../.mocharc.js), these manifests provide a strategic mechanism of the CI: 
- Test levels, ranks, and groups
- Source file mappings
- Command specifications
- Documentation references

## Testing Framework

The project uses [Mocha](https://mochajs.org/) as its test runner with a hybrid architecture combining traditional integration tests and manifest-driven end-to-end tests. A centralized configuration file, [`.mocharc.js`](../.mocharc.js), defines test groups and paths, making the suite flexible and manageable.

### YAML Manifests

End-to-end tests use declarative YAML manifests that define test scenarios, enabling user-extensible workflows and efficient batch processing of test cases.

### Running Tests

Tests can be executed in a variety of ways to target specific groups, levels, or specific test files.

* Run all tests
  ```bash
  npm test
  ```
* Run a specific group
  ```bash
  npm test -- --group level3
  ```
* Run a specific test file by `grep`ping for its test ID
  ```bash
  npm test -- --grep "3.5.1"
  ```
* Run a single test file by path (integration tests)
  ```bash
  npm test -- 'test/runners/integration/config/config-resolver.test.js'
  ```
* Run a single test file by path (end-to-end tests)
  ```bash
  node test/runners/end-to-end/e2e-runner.js \
       test/runners/end-to-end/cli/config.manifest.yaml \
       # --show   # Show test output 
       # --debug  # Show intermediate steps
  ```

## QA and Telemetry

The analytics system provides intelligent insights into test performance, brittleness, and historical patterns to optimize development workflows.

### Core Analytics Tools

* [qa-analytics.js](analytics/qa-analytics.js) analyzes test brittleness and failure patterns
  ```bash
  node test/analytics/qa-analytics.js [--limit 20] [--min-runs 5]
  ```
* [test-watcher.js](analytics/test-watcher.js) for smart test selection based on source changes
  ```bash
  node test/analytics/test-watcher.js
  ```
* [log-failures-reporter.js](analytics/log-failures-reporter.js) for tracking test history
* [run-last-fails.js](analytics/run-last-fails.js) to re-run previously failed tests
  ```bash
  npm run test:last-fails
  ```

### Data Storage

Test analytics data is stored in `~/.local/share/oshea/test-analytics/test-results.json` tracks
- success/failure counts per test
- volatility classification (stable/flaky/unstable)
- temporal tracking (first seen, last run)
- performance metrics (duration, error patterns)

## Historical

All formation-era test documentation and deprecated tools are preserved in the archive.

* [Archive Index](archive/README.md): Complete historical documentation
* [Legacy QA Tools](archive/scripts/): Deprecated analysis scripts  
* [Original Checklists](archive/docs/): Markdown-based test checklists
* [Test Generation Priority Order](archive/docs/test-generation-priority-order.md): Test roll out implementation strategy
* [Next-Generation Testing Framework](../docs/archive/v0.11/next-generation-testing.md) toward a YAML manifest system
