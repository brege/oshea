### Refactoring Procedure Summary

Here is a high-level description of the procedure we developed to refactor the `PluginRegistryBuilder` module and its tests. This can serve as a template for tackling similar modules in the future.

#### **Procedure: Modernizing a Module with Manifest-Based Testing**

1. **Objective:** To refactor a legacy module (`.js` file) and its associated, fragmented integration tests (`*.test.x.y.z.js`) into a modern, maintainable structure using a centralized logger and a declarative, manifest-driven testing approach.

2. **Phase 1: Initial Consolidation and Logging Integration**

  * **Application Code:** The first step is to refactor the target application module (e.g., `PluginRegistryBuilder.js`). All `console.log`, `warn`, and `error` calls are replaced with the centralized `logger`.
  * **Test Consolidation:** All individual test files (`.test.x.y.z.js`) are migrated into a series of **manifest files** (e.g., `module.constructor.manifest.js`, `module.methodA.manifest.js`). Each manifest is an array of test case objects.
  * **Central Test Runner:** A single test runner (e.g., `module.test.js`) is created. This runner is responsible for:
    * Importing all the new manifest files.
    * Injecting a `testLogger` from `test/shared/capture-logs.js` by manipulating `require.cache`. This is critical for asserting log output.
    * Dynamically iterating through the test cases from the manifests and executing them.

3. **Phase 2: Declarative Refactoring with Test Case Factories**

  * **Identify Boilerplate:** The consolidated manifests will still contain significant repetitive mocking and setup logic. The goal of this phase is to eliminate it.
  * **Create a Helper Factory:** A new helper file (e.g., `test/shared/case-factories.js`) is created.
  * **Develop Factories:** For each distinct, repeated test pattern (e.g., testing CM manifest parsing, testing file resolution), a factory function is created in the helper file.
    * **Input:** The factory takes a simple configuration object with only the *unique* parameters for a given test (e.g., the specific plugins in a manifest, the expected result, the warning messages).
    * **Logic:** The factory's responsibility is to generate the complex `setup` and `assert` functions, containing all the necessary `sinon` stubs and assertions.
  * **Refactor Manifests:** The manifest files are then refactored. The large, imperative `setup` and `assert` blocks are replaced with a single, declarative call to the appropriate factory function, using the spread syntax (`...`).

4. **Final Result:**

  * The application code uses a modern, centralized logger.
  * The tests are organized, easy to read, and highly maintainable.
  * Test cases in the manifests are reduced to a few lines that clearly describe the *intent* of the test, not the implementation details of the mocks.
  * The test suite has full parity with the original, ensuring no loss of coverage.
