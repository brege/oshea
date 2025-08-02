# Batch Processing Guide

This guide explains how to perform batch conversions of multiple Markdown files to individual PDFs using `md-to-pdf`. The recommended approach is using YAML workflows, which provide a declarative, maintainable solution that integrates with the existing test infrastructure.

## Batch Processing Hugo Recipes - YAML Workflow (Recommended)

The recommended approach for batch processing is using YAML workflows, which provide a declarative, self-documenting method that integrates seamlessly with the existing test infrastructure.

In due time, this approach will be mainlined into the `md-to-pdf` CLI once stability for v0.11 is achieved.

#### Workflow Location
```bash
test/runners/smoke/workflows/demo-hugo-batch-convert.manifest.yaml
```

#### Output

PDFs will be generated in isolated test workspaces, with automatic discovery of all Hugo recipe directories and validation of successful conversion.

#### Execution

1.  **Basic execution** - Run the workflow directly:

    ```bash
    node test/runners/smoke/yaml-test-runner.js \
        test/runners/smoke/workflows/demo-hugo-batch-convert.manifest.yaml
    ```

2.  **With visual inspection** - Use `--show` to see commands and output in real-time:

    ```bash
    node test/runners/smoke/yaml-test-runner.js \
        test/runners/smoke/workflows/demo-hugo-batch-convert.manifest.yaml --show
    ```

3.  **Via mocha integration** - Run as part of the test suite:

    ```bash
    npm test -- --group yaml --grep "4.2"
    ```

#### Features

- **Automatic Discovery**: Discovers all recipe directories in `test/runners/fixtures/hugo-example`
- **Level 4 Workflow Tests**: Part of the comprehensive YAML workflow testing system
- **Workspace Isolation**: Each conversion runs in an isolated temporary workspace
- **Validation**: Automatically verifies successful execution and minimum file sizes
- **Two Variants**: Basic conversion (4.2.1) and enhanced with custom filenames (4.2.2)

>## Legacy Batch Processing Scripts (Deprecated)
>
>The following Node.js and Bash scripts are maintained for reference but are deprecated in favor of YAML workflows. They demonstrate custom batch processing approaches but require more maintenance and lack integration with the test infrastructure.
>
> ### Old Node.js and Bash Scripts
> 
> Located at [`scripts/batch/batch-convert-hugo-recipes.js`](../../scripts/batch/batch-convert-hugo-recipes.js), this script provides flexible metadata extraction and custom filename generation.
>
> Located at `scripts/batch/batch_convert_hugo_recipes.sh`, this shell-based approach uses `yq` for YAML parsing and provides similar functionality to the Node.js version.

## Customizing YAML Workflows

To create your own batch processing workflows, you can modify the demo workflow or create new ones based on your specific needs:

### Creating Custom Workflows

1. **Copy the demo workflow**:
   ```bash
   cp test/runners/smoke/workflows/demo-hugo-batch-convert.manifest.yaml \
      test/runners/smoke/workflows/my-custom-batch.manifest.yaml
   ```

2. **Modify discovery settings**:
   - Change `source` to point to your directory
   - Adjust `filter` (directories, files) and `pattern` as needed

3. **Update scenarios**:
   - Modify `args` to use different plugins or options
   - Adjust file validation in `expect` section
   - Add custom naming with `--filename` flag

### Key YAML Workflow Features

- **Discovery Types**: `directory_scan` for automatic file/directory discovery
- **Template Variables**: `{{paths.variableName}}` for path resolution, `{{tmpdir}}` for workspace isolation
- **Validation**: Use `file_exists`, `file_min_size`, `contains` for output verification
- **Show Mode**: Always test with `--show` flag to see commands and output in real-time
- **Debugging**: Use `--debug` for additional logging, adding intermediate steps between operaitonal scenarios

### Example Customization

```yaml
name: batch convert my documents
test_id: 5.2.1
discovery:
  type: directory_scan
  source: my-docs
  filter: files
  pattern: "*.md"
scenarios:
  - description: convert {item} to PDF with custom styling
    args: convert my-docs/{item} --plugin my-custom-plugin --outdir {{tmpdir}} --no-open
    expect:
      file_exists: "{{tmpdir}}/*.pdf"
```

## Legacy Tips for Custom Scripts (Deprecated)

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
