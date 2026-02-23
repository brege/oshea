---
name: claude-oshea-plugin-archetyper
description: Create or update oshea plugins from a visual reference image or concise design brief by using the built-in plugin archetyper workflow (`node cli.js plugin create --from ...`) instead of the AI context package + giant paste method. Use when a Claude-style agent must generate a functioning plugin and prove it by running `oshea convert`.
---

# Objective

Produce a working `oshea` plugin from an image/description with minimal prompt input.

# Scope

Create an [oshea](https://github.com/brege/oshea) plugin from a visual reference image or concise design brief.

# Hard Constraints

- Use plugin archetyping as the scaffold path.
- Do not rely on a giant context paste workflow.
- Run commands with `node cli.js ...` from repo root.
- Keep plugin code aligned with project rules:
  - Include required file header comment in JavaScript files.
  - Use `@paths` imports.
  - Avoid `console.*` and `chalk.*` in application code.

# Workflow

1. Bootstrap technical context (replacement for old harness)
- Read:
  - `docs/ai/interaction-spec.md`
  - `docs/refs/plugin-contract.md`
  - `docs/walkthroughs/archetyping-a-plugin.md`
  - `docs/refs/cheat-sheet.md`
- Choose one built-in base plugin and read this exact file set from it:
  - `<plugin>.config.yaml`
  - `<plugin>.css`
  - `<plugin>-example.md`
  - `index.js`
  - `README.md`

2. Parse the request
- Extract target look, document type, page size, and expected text structure from the user prompt and image.
- Convert the image into concrete layout targets: major regions, alignment, typography intent, spacing rhythm, and palette.

3. Scaffold with archetyper
- Choose a base plugin close to target shape.
- For fixed-size cards/posters, use `advanced-card` unless a different built-in is explicitly required.
- Use built-in sources only (`template-basic`, `default`, `advanced-card`, `cv`, `cover-letter`, `recipe`, `recipe-book`).
- Do not archetype from previously AI-generated plugin folders.
- Run:
```bash
node cli.js plugin create <new-plugin-name> --from <base-plugin> --outdir plugins
```
- Prefer kebab-case names tied to the requested artifact.
- Verify scaffold provenance in `plugins/<new-plugin-name>/.source.yaml`:
  - `archetype_source` must be `bundled`
  - `created_from` must point to a built-in plugin path

4. Implement plugin contract
- Ensure required files exist (validator-critical):
  - `plugins/<new-plugin-name>/index.js`
  - `plugins/<new-plugin-name>/<new-plugin-name>.config.yaml`
  - `plugins/<new-plugin-name>/<new-plugin-name>-example.md`
  - `plugins/<new-plugin-name>/README.md`
- Keep README YAML front matter valid.
- Keep `plugin_name` equal to directory name.
- Keep protocol as `v1`.

5. Implement handler and layout
- Handler interface must be:
  - `constructor(coreUtils)`
  - `async generate(data, pluginConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath)`
- Use `markdownUtils.extractFrontMatter`, `markdownUtils.renderMarkdownToHtml`, and `pdfGenerator.generatePdf`.
- Follow `plugins/advanced-card/index.js` PDF merge pattern.
- If `pdf_options.width` or `pdf_options.height` is set, delete `pdfOptions.format` before `generatePdf`:
```js
if (pdfOptions.width || pdfOptions.height) {
  delete pdfOptions.format;
}
```
- Ensure JS creates explicit semantic structure aligned with the visual topology (not just raw rendered markdown).
- Ensure CSS expresses hierarchy with multiple regions and deliberate spacing.
- When script lettering is key, include webfont import plus fallback stack.

6. Enforce visual quality bar
- Do not ship a trivial centered text page.
- Match dominant composition first (relative placement and proportions), then polish typography/colors.
- Prevent accidental title wrapping when the design requires a single script headline (`white-space: nowrap`, tuned font size, and line-height).

7. Validate with execution
- Run conversion with the new plugin:
```bash
node cli.js convert plugins/<new-plugin-name>/<new-plugin-name>-example.md --plugin <new-plugin-name> --outdir /tmp/oshea-skill-validate --open false
```
- Run validator:
```bash
node cli.js plugin validate plugins/<new-plugin-name>
```
- Run self-activation check (no explicit `--plugin`):
```bash
node cli.js convert plugins/<new-plugin-name>/<new-plugin-name>-example.md --outdir /tmp/oshea-skill-validate --open false
```
- Verify command success and output file creation.
- Inspect merged config if behavior is surprising:
```bash
node cli.js config --plugin <new-plugin-name> --pure
```
- If image comparison is requested, rasterize PDF and compare composition to the reference by structure (regions, spacing, alignment), not only exact pixel identity.
- Enforce page-size sanity check:
```bash
pdftoppm -png -singlefile /tmp/oshea-skill-validate/<new-plugin-name>-example.pdf /tmp/oshea-skill-validate/<new-plugin-name>-example
magick identify -format '%wx%h\n' /tmp/oshea-skill-validate/<new-plugin-name>-example.png
```
- For a 6x8in card at default rasterization, expect roughly `900x1200` output. Reject outputs that look like letter page dimensions.
- Run one visual sanity assertion before reporting success: ensure the rendered page has no large unused margin area relative to the target composition.
- Treat these as blocking regressions:
  - large unused canvas margins caused by page-size mismatch
  - major heading style mismatch (e.g., script target rendered as default serif)
  - major block-order or alignment mismatch

8. Report
- Return:
  - Files changed
  - Why the layout is topologically consistent with the reference
  - Exact convert command executed
  - Validation outcome

# Failure Handling

- If archetyping fails because target directory exists, choose a new plugin name and rerun.
- If conversion fails, fix plugin/config errors and rerun until conversion succeeds.
