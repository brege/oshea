# Batch Processing Guide

This guide explains how to perform batch conversions of multiple Markdown files to individual PDFs using `oshea`. The recommended approach is using YAML workflows, which provide a declarative, maintainable solution that integrates with the existing test infrastructure.

## YAML Workflows (Recommended)

The recommended approach for batch processing is using YAML workflows, which provide a declarative, self-documenting method that integrates seamlessly with the existing test infrastructure.

In due time, this approach will be mainlined into the `oshea` CLI once stability for v0.11 is achieved.

### Example: Batch Processing Hugo Recipes

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
- **Debugging**: Use `--debug` for additional logging, adding intermediate steps between operational scenarios

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

> ## Legacy Scripts (Historical Reference)
> 
> Legacy batch processing scripts have been deprecated in favor of YAML workflows. For historical reference, the previous approach using Node.js and Bash scripts can be found in this repository snapshot:
> 
> **Historical Reference**: [Legacy batch processing guide](https://github.com/brege/oshea/blob/4d1ceb01ed241e7c8e955ecc29e2e228ce3f0abe/docs/guides/batch-processing-guide.md)

