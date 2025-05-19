# Test Suite for md-to-pdf

This directory contains the integration test suite for the `md-to-pdf` Node.js application. The tests are designed to verify the core functionalities of the `cli.js` script, including:

* Single Markdown file conversion for different document types (CV, Cover Letter, Recipe) using the new plugin architecture.
* Recipe book generation via the "recipe-book" plugin.
* Batch Hugo recipe PDF export with slug-author-date naming, using a base plugin for styling.

## Directory Contents

* **`run-tests.js`**: The main Node.js script that executes all test cases. It uses `cli.js` to generate PDFs and then checks for their existence and basic validity (non-zero file size).
* **`config.test.yaml`**: A dedicated configuration file used by `run-tests.js`. It ensures predictable behavior during tests, such as disabling the PDF viewer and using fixed settings. It defines global test settings and registers the necessary document type plugins (e.g., under `document_type_plugins`) by pointing to their actual configuration files (e.g., `plugins/cv/cv.config.yaml`).
* **`test_output/`**: (Automatically generated during test runs) This directory is created by `run-tests.js` to store all PDF files generated during the tests. It is cleaned up after tests complete, unless the `KEEP_OUTPUT=true` environment variable is set or the `--keep-output` flag is used when running the tests.
    * `test_output/hugo-example-source/`: A copy of the main `examples/hugo-example/` directory is placed here during the `hugo-export-each` test to ensure generated PDFs are contained within the test output area.

## Running Tests

To run the test suite:

1.  Ensure you are in the project's root directory.
2.  Make sure all project dependencies are installed (`npm install`).
3.  Execute the test script via npm:

    ```bash
    npm test
    ```
    (This assumes you have updated the `scripts.test` entry in your main `package.json` to `node test/run-tests.js`)

    Alternatively, you can run the script directly:

    ```bash
    node test/run-tests.js
    ```

### Test Output

The script will print output to the console indicating:
* Which test is currently running.
* The `cli.js` command being executed.
* Stdout/stderr from `cli.js`.
* Success or failure status for each file check (existence and size).
* A summary of tests passed and failed.

The script will exit with code `0` if all tests pass, and `1` if any test fails.

### Keeping Test Output

To inspect the generated PDFs after a test run, you can prevent the `test_output/` directory from being automatically deleted:

* **Using an environment variable:**

    ```bash
    KEEP_OUTPUT=true npm test
    # or
    KEEP_OUTPUT=true node test/run-tests.js
    ```

* **Using a command-line flag:**

    ```bash
    node test/run-tests.js --keep-output
    ```

## Test Cases

The specific test cases are defined within `run-tests.js`. They utilize the example Markdown files from the main `examples/` directory and the settings in `test/config.test.yaml`. Each test case typically involves:

1.  Executing a `cli.js` command. The test cases invoke `cli.js` with commands that reflect the current plugin architecture (e.g., `convert --plugin <name>`, `generate <pluginName> --option value`, `hugo-export-each --base-plugin <name>`).
2.  Specifying one or more expected output PDF files.
3.  Verifying that these output files are created in the `test/test_output/` directory and have a non-zero file size.

For the "Batch Hugo PDF Export" test, the `examples/hugo-example/` directory is first copied into `test/test_output/hugo-example-source/` to ensure generated PDFs are sandboxed within the test output area.

## Adding New Tests

To add new tests (e.g., for a new plugin):

1.  Add new example Markdown files (or other necessary input files for your plugin) to the main `examples/` directory if needed.
2.  Update `test/config.test.yaml` to ensure the new plugin being tested is registered under the `document_type_plugins` section, pointing to its actual configuration file (e.g., `plugins/my-new-plugin/my-new-plugin.config.yaml`). Any global test settings impacting your new plugin should also be considered.
3.  Add a new test case object to the `testCases` array in `run-tests.js`, defining:
    * `description`: A clear description of the test.
    * `commandArgs`: The arguments to pass to `cli.js`. Remember to use `path.join()` for file paths and ensure output directories point to `TEST_OUTPUT_BASE_DIR`. Use the current command syntax (e.g., `convert --plugin your-plugin-name ...` or `generate your-plugin-name --custom-arg ...`).
    * `expectedOutputs`: An array of objects, each detailing an expected PDF (`filePath` relative to `TEST_OUTPUT_BASE_DIR`, and `minSize`).
    * `preTestSetup`: (Optional) An async function if the test requires specific setup before running the CLI command (e.g., copying files).
