# Test Suite for md-to-pdf

This directory contains the integration test suite for the `md-to-pdf` Node.js application. The tests are designed to verify the core functionalities of the `cli.js` script, including:

* Single Markdown file conversion for different document types (CV, Cover Letter, Recipe) using the plugin architecture.
* Recipe book generation via the "recipe-book" plugin.
* Batch Hugo recipe PDF export with slug-author-date naming, using a base plugin for styling.
* CLI command functionalities, such as `plugin list` and the `plugin create` command.

## Directory Contents

* **`run-tests.js`**: The main Node.js script that executes all test cases. It uses `cli.js` to perform actions and then checks for expected outcomes (e.g., PDF generation, file/directory creation, correct error messages).
* **`config.test.yaml`**: A dedicated configuration file used by `run-tests.js` for PDF generation tests. It ensures predictable behavior during tests, such as disabling the PDF viewer and using fixed settings. It defines global test settings and registers the necessary document type plugins.
* **`assets/`**: Contains mock configuration files and CSS used for testing specific override scenarios (e.g., project-specific configs for the `cv` plugin).
* **`custom_plugins/`**: Contains a dummy "business-card" plugin used to test the loading and functionality of user-defined plugins located outside the main project's `plugins/` directory.
* **`test_output/`**: (Automatically generated during test runs) This directory is created by `run-tests.js` to store all PDF files and any other artifacts (like scaffolded plugins from `plugin create` tests) generated during the tests. It is cleaned up after tests complete, unless the `KEEP_OUTPUT=true` environment variable is set or the `--keep-output` flag is used when running the tests.
    * `test_output/hugo-example-source/`: A copy of the main `examples/hugo-example/` directory is placed here during the `hugo-export-each` test to ensure generated PDFs are contained within the test output area.
    * `test_output/created_plugins_test/`: Subdirectory specifically used by `plugin create` tests to scaffold new plugin boilerplates, ensuring they are also managed by the cleanup process.

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
* Success or failure status for each file check (existence, size, content) or behavioral check.
* A summary of tests passed and failed.

The script will exit with code `0` if all tests pass, and `1` if any test fails.

### Keeping Test Output

To inspect the generated PDFs or scaffolded plugins after a test run, you can prevent the `test_output/` directory from being automatically deleted:

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

The specific test cases are defined within `test/run-tests.js`. They utilize example Markdown files, assets, and test configurations. Below is a summary of what each test aims to achieve. *(Note: Most PDF generation commands implicitly use `--config test/config.test.yaml` as defined in `run-tests.js`)*.

### PDF Generation Tests

1.  **CV: Convert with Explicit Filename**
    * Command:
        ```bash
        md-to-pdf convert examples/example-cv.md --plugin cv --outdir ./test_output --filename test-cv.pdf
        ```
    * Expected: Test PASSED. PDF `test-cv.pdf` is created in `./test_output/`.

2.  **CV: Convert with Default Filename**
    * Command:
        ```bash
        md-to-pdf convert examples/example-cv.md --plugin cv --outdir ./test_output
        ```
    * Expected: Test PASSED. PDF `example-curriculum-vitae.pdf` is created in `./test_output/`.

3.  **Cover Letter: Convert with Explicit Filename**
    * Command:
        ```bash
        md-to-pdf convert examples/example-cover-letter.md --plugin cover-letter --outdir ./test_output --filename test-cover-letter.pdf
        ```
    * Expected: Test PASSED. PDF `test-cover-letter.pdf` is created in `./test_output/`.

4.  **Single Recipe: Convert with Default Filename**
    * Command:
        ```bash
        md-to-pdf convert examples/example-recipe.md --plugin recipe --outdir ./test_output
        ```
    * Expected: Test PASSED. PDF `example-recipe-title.pdf` is created in `./test_output/`.

5.  **Recipe Book: Create from Hugo Examples**
    * Command:
        ```bash
        md-to-pdf generate recipe-book --recipes-base-dir examples/hugo-example --outdir ./test_output --filename test-recipe-book.pdf
        ```
    * Expected: Test PASSED. PDF `test-recipe-book.pdf` (a combined recipe book) is created in `./test_output/`.

6.  **Batch Hugo PDF Export**
    * Command:
        ```bash
        md-to-pdf hugo-export-each ./test_output/hugo-example-source --base-plugin recipe --hugo-ruleset default_rules
        ```
    * Expected: Test PASSED. Multiple PDFs (e.g., `recipe-one-culinary-enthusiast-2023-10-27.pdf`) are created in their respective subdirectories within `./test_output/hugo-example-source/`.

7.  **Project Config: Convert CV with Overrides**
    * Command:
        ```bash
        md-to-pdf convert examples/example-cv.md --plugin cv --config test/assets/override_config/cv_test.yaml --outdir ./test_output --filename test-cv-project-override.pdf --no-open
        ```
    * Expected: Test PASSED. PDF `test-cv-project-override.pdf` is created in `./test_output/`, reflecting overridden styles (e.g., A5 format, green theme).

8.  **Custom Plugin: Convert Business Card**
    * Command:
        ```bash
        md-to-pdf convert test/assets/example-business-card.md --plugin business-card --outdir ./test_output --filename test-business-card.pdf --no-open
        ```
    * Expected: Test PASSED. PDF `test-business-card.pdf` is created in `./test_output/` using the custom "business-card" plugin.

9.  **Math Rendering: Convert Document with KaTeX**
    * Command:
        ```bash
        md-to-pdf convert examples/example-math.md --plugin default --outdir ./test_output --no-open
        ```
    * Expected: Test PASSED. PDF `math-test-document.pdf` is created in `./test_output/` with mathematical formulas rendered.

### `plugin create` Tests

The test suite verifies the `md-to-pdf plugin create` command with several distinct scenarios. These are defined in `test/run-tests.js`.

1.  **Basic Plugin Scaffolding:**
    * Command:
        ```bash
        md-to-pdf plugin create scaffold-test1 --dir ./test_output/created_plugins_test
        ```
    * Expected: Test PASSED. Creates the following structure and files:
        ```
        ./test_output/created_plugins_test/scaffold-test1/
        ├── scaffold-test1.config.yaml
        ├── index.js
        └── scaffold-test1.css
        ```
        `stdout` includes: "Plugin 'scaffold-test1' created successfully..."

2.  **Error on Existing Directory (without `--force`):**
    * Command (run after the "Basic Plugin Scaffolding" test):
        ```bash
        md-to-pdf plugin create scaffold-test1 --dir ./test_output/created_plugins_test
        ```
    * Expected: Test PASSED. The command fails, and `stderr` includes:
        ```
        ERROR: Plugin directory '.../created_plugins_test/scaffold-test1' already exists. Use --force to overwrite.
        ```

3.  **Overwrite Existing Directory (with `--force`):**
    * Command:
        ```bash
        md-to-pdf plugin create scaffold-test1 --dir ./test_output/created_plugins_test --force
        ```
    * Expected: Test PASSED. Files are (re)created in the `scaffold-test1` directory. `stderr` includes a warning about overwriting, and `stdout` includes a success message.

4.  **Rejection of Invalid Plugin Name:**
    * Command (using an example invalid name like "bad!name"):
        ```bash
        md-to-pdf plugin create "bad!name" --dir ./test_output/created_plugins_test
        ```
    * Expected: Test PASSED. The command fails, and `stderr` includes:
        ```
        ERROR: Invalid plugin name: "bad!name". Name must be alphanumeric and can contain hyphens, but not start/end with them.
        ```

5.  **Correct Handling of Hyphenated Plugin Names:**
    * Command:
        ```bash
        md-to-pdf plugin create my-hyphen-plugin --dir ./test_output/created_plugins_test
        ```
    * Expected: Test PASSED. Creates plugin `my-hyphen-plugin`. The `index.js` file contains a class named `MyHyphenPluginHandler`.

For exact file content checks or other specific assertions, refer to the `postTestChecks` functions in `test/run-tests.js`.

## Adding New Tests

The process for adding new tests depends on the type of functionality you are testing:

**1. Testing Document Conversion Plugins:**
   (e.g., for a new plugin like "my-brochure" or a new scenario for an existing plugin)

* **Input Files:** Place example Markdown files in `examples/` or test-specific assets in `test/assets/`.
* **Plugin Registration:** If it's a new plugin, register it in `test/config.test.yaml` under `document_type_plugins` (e.g., `my-brochure: "plugins/my-brochure/my-brochure.config.yaml"`).
* **Test Case Object:** Define:
    * `description`: What the test does.
    * `commandArgs`: The CLI arguments for `convert` or `generate` (e.g., `['convert', 'examples/my-brochure.md', '--plugin', 'my-brochure']`). Ensure outputs go to `TEST_OUTPUT_BASE_DIR`.
    * `expectedOutputs`: An array specifying expected PDF names and minimum sizes (e.g., `{ filePath: 'my-brochure.pdf', minSize: 1000 }`).
    * `preTestSetup` (Optional): For setup actions like copying files.

**2. Testing CLI Commands or Other Tool Features:**
   (e.g., for `plugin list`, `plugin create` options, or options like `--factory-defaults`)

* **Test Case Object:** Define:
    * `description`: What the test does.
    * `commandArgs`: The CLI arguments for the command being tested.
    * `postTestChecks`: An **async function** that receives a `result` object (containing `success` status, `stdout`, `stderr` from the command). This is where you'll make your assertions:
        * Check `result.success` (e.g., to verify a command failed when expected).
        * Examine `result.stdout` or `result.stderr` for specific messages.
        * Confirm file/directory creation or content (using `fss.existsSync()` or the `readFileContent` helper in `run-tests.js`).
    * `preTestSetup` (Optional): For setting up specific file system states.

**General Tips for New Tests:**
* Direct all test outputs and created artifacts to subdirectories within `TEST_OUTPUT_BASE_DIR` (e.g., `CREATED_PLUGINS_DIR` for `plugin create` tests) to ensure they are correctly cleaned up.
* Refer to existing entries in `test/run-tests.js` for concrete examples of different test case structures.
