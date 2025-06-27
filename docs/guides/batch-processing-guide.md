# Batch Processing with External Scripts

This guide explains how to perform batch conversions of multiple Markdown files to individual PDFs using `md-to-pdf` through external scripts. This approach provides maximum flexibility, allowing you to tailor file discovery, naming conventions, and specific conversion logic to your unique workflow, while leveraging the full plugin capabilities of `md-to-pdf` for each file.

## Batch Processing Hugo Recipes - Node.js Example

This example demonstrates using a Node.js script as a flexible wrapper for `md-to-pdf` to convert all recipes from a specified source directory to a target directory containing individual PDFs.

#### Script Location
```bash
scripts/batch_convert_hugo_recipes.js
```

#### Output

PDFs will be generated in `batch_output/hugo_recipes_node/`, with each recipe in its own subfolder, named in `<slug>-<author>-<date>` pattern.

#### Execution

1.  Install necessary Node.js packages for the script (if not already project dependencies):

    ```bash
    npm install glob gray-matter yargs
    ```

2.  Execute the script, providing the required arguments:

    ```bash
    node scripts/batch_convert_hugo_recipes.js \
        --source-dir ./examples/hugo-example \
        --output-dir ./batch_output/hugo_recipes_node \
        --base-plugin recipe
    ```

      * `--source-dir`: Points to the directory containing your Markdown collections (`examples/hugo-example`).
      * `--output-dir`: Specifies where the generated PDFs (and their subdirectories) will be saved.
      * `--base-plugin`: The `md-to-pdf` plugin to use for styling each recipe.
      * You can also use the (optional) `--md-to-pdf-path` argument if your [`cli.js`](../../cli.js) file is not at the default location relative to the script.

PDFs will be generated in `batch_output/hugo_recipes_node/`, with each recipe in its own subfolder. You can adapt the glob pattern, metadata extraction, and filename logic within the script for different needs and output requirements.

## Batch Processing Hugo Recipes - Bash Example

This example provides a Bash script to achieve a similar outcome as the Node.js script: converting all recipes from a specified source directory.

#### Script Location

```bash
scripts/batch_convert_hugo_recipes.sh
```

#### Output

PDFs will be generated in `batch_output/hugo_recipes_bash/`, with each recipe in its own subfolder and individual filenames in the `<slug>-<author>-<date>` pattern.

#### Execution

1.  Make the script executable:

    ```bash
    chmod +x scripts/batch_convert_hugo_recipes.sh
    ```

2.  Create output directory if it doesn't exist:

    ```bash
    mkdir -p ./batch_output/hugo_recipes_bash
    ```

3.  Execute the script, providing the required arguments (source directory, output directory, base plugin):

    ```bash
    ./scripts/batch_convert_hugo_recipes.sh \
        ./examples/hugo-example \
        ./batch_output/hugo_recipes_bash \
        recipe
    ```

      * The first argument is the source directory ([`./examples/hugo-example`](../../examples/hugo-example)).
      * The second argument is the base directory where PDFs will be saved.
      * The third argument is the `md-to-pdf` plugin to use for styling.
      * You can also use the (optional) `--md-to-pdf-path` argument if your [`cli.js`](../../cli.js) file is not at the default location relative to the script.

PDFs will be generated in `batch_output/hugo_recipes_bash/`, with each recipe in its own subfolder. You can adapt the `find` command, metadata extraction logic (especially the `get_fm_value` function), and filename construction within the script for different needs and output requirements.

## General Tips for Customizing Your Batch Scripts

These tips apply to modifying the example scripts located in the [`scripts/`](../../scripts/) directory.

### Node.js

##### File Discovery

  * Change `glob.sync('**/index.md', ...)` to match your file structure.
  * Examples: `'*.md'` (flat directory), `'docs/**/*.md'` (recursive).

##### Metadata & Naming:

  * Adjust logic in `processRecipe()` to parse front matter keys relevant to your files.
  * Modify how `outputFilename` is constructed based on your needs.

##### `md-to-pdf` Call

  * Alter the `basePlugin` variable or make it an argument.
  * Add `--config /path/to/project.config.yaml` if your plugins or global `params` are defined there.

### Bash

##### File Discovery

  * Modify the `find` command (e.g., `find "$SOURCE_BASE_DIR" -maxdepth 1 -name "*.md" ...` for flat directories).

##### Metadata & Naming:

  * Adapt the `get_fm_value` function (especially the `grep/sed` fallback if not using `yq`) for your front matter keys.
  * Change the `output_filename` construction logic.

##### `md-to-pdf` Call

  * Change the `BASE_PLUGIN` variable.
  * Add `--config /path/to/project.config.yaml` to the `$MD_TO_PDF_CMD convert ...` line if needed.

##### Front Matter

`yq` is better for YAML complexity

  - **Fedora**
    ```bash
    sudo dnf install yq
    ```
  - **Debian**
    ```bash
    sudo apt install yq
