# Walkthrough: Creating a Deck of Digital Notecards

This guide will walk you through creating a `notecard-deck` plugin to generate a PDF of study notecards. You'll learn how to combine multiple small Markdown files into a single document and then, with a simple configuration change, reformat the entire deck for easy viewing on a mobile device.

### The Goal

We will create a set of simple Markdown files, each representing a two-sided notecard. A horizontal rule (`---`) will separate the "front" (the term) from the "back" (the definition). Then, we'll use a custom plugin to generate a printable PDF and a mobile-friendly version.

---

### Step 1: Create the `notecard-deck` Plugin

First, create a new directory named `notecard-deck`. Inside this directory, create the following three files. These files will define the logic and style for our plugin.

**File 1: `notecard-deck/notecard-deck.config.yaml`**

This is the manifest for our plugin. It defines the handler and the initial PDF options for a standard letter-sized page.

```yaml
plugin_name: "notecard-deck"
version: "1.0.0"
protocol: "v1"

description: "A plugin to compile a directory of Markdown notecards into a single PDF deck."
handler_script: "index.js"

css_files:
  - "notecard-deck.css"

pdf_options:
  format: "Letter"
  margin:
    top: "0.5in"
    right: "0.5in"
    bottom: "0.5in"
    left: "0.5in"

# We define a custom argument for our `generate` command here.
watch_sources:
  - type: "directory"
    path_from_cli_arg: "cardsDir"
```

**File 2: `notecard-deck/notecard-deck.css`**

This CSS will style our notecards. Crucially, it ensures that each notecard starts on a new page.

```css
/* notecard-deck.css */
.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  border: 2px solid #ddd;
  box-sizing: border-box;
  page-break-after: always;
  font-family: Arial, sans-serif;
}

.card h1 {
  font-size: 3em;
  color: #333;
}

.card p {
  font-size: 1.5em;
  color: #555;
  padding: 0 1em;
}
```

**File 3: `notecard-deck/index.js`**

This is the logic for our plugin. It reads all Markdown files from a specified directory, wraps each one in a `div` with the class `card`, and combines them into a single document for conversion.

```javascript
// notecard-deck/index.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');

class NotecardDeckHandler {
    constructor(coreUtils) {
        this.markdownUtils = coreUtils.markdownUtils;
        this.pdfGenerator = coreUtils.pdfGenerator;
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        const cardsDir = data.cliArgs && data.cliArgs.cardsDir;
        if (!cardsDir || !fss.existsSync(cardsDir)) {
            throw new Error(`The required '--cards-dir' option was not provided or the directory does not exist.`);
        }

        let combinedHtml = '';
        const files = await fs.readdir(cardsDir);

        for (const file of files) {
            if (path.extname(file) === '.md') {
                const filePath = path.join(cardsDir, file);
                const rawContent = await fs.readFile(filePath, 'utf8');
                const htmlContent = this.markdownUtils.renderMarkdownToHtml(rawContent);
                // Wrap each card's content in a styled div
                combinedHtml += `<div class="card">${htmlContent}</div>\n`;
            }
        }
        
        const pdfOptions = { ...(pluginSpecificConfig.pdf_options || {}) };
        const cssFiles = pluginSpecificConfig.css_files || [];
        const cssContents = [];
        for (const cssFile of cssFiles) {
            const cssPath = path.resolve(pluginBasePath, cssFile);
            if(fss.existsSync(cssPath)) {
                cssContents.push(await fs.readFile(cssPath, 'utf8'));
            }
        }

        const finalOutputFilename = outputFilenameOpt || 'notecard-deck.pdf';
        const outputPdfPath = path.join(outputDir, finalOutputFilename);

        await this.pdfGenerator.generatePdf(
            combinedHtml,
            outputPdfPath,
            pdfOptions,
            cssContents
        );

        return outputPdfPath;
    }
}

module.exports = NotecardDeckHandler;
```

---

### Step 2: Create Your Notecards

Now, create a directory for your notecard content, and add a few simple Markdown files.

1.  Create a directory: `mkdir my-notecards`
2.  Create the following files inside `my-notecards/`:

**File: `my-notecards/mitochondrion.md`**

```markdown
# Mitochondrion
---
The powerhouse of the cell.
```

**File: `my-notecards/ribosome.md`**

```markdown
# Ribosome
---
A complex of RNA and protein that synthesizes new proteins.
```

**File: `my-notecards/nucleus.md`**

```markdown
# Nucleus
---
Contains the cell's genetic material and controls its growth and reproduction.
```

---

### Step 3: Add and Generate Your Notecard Deck

First, add your new `notecard-deck` plugin so `oshea` can use it.

**Command:**

```bash
oshea plugin add ./notecard-deck
```

Now, run the `generate` command, pointing to your content directory.

**Command:**

```bash
oshea generate notecard-deck --cards-dir ./my-notecards --outdir ./output
```

This will create a `notecard-deck.pdf` file in the `output/` directory, with each card on a separate, letter-sized page.

---

### Step 4: Reformat for Mobile with One Change

This is where the power of the system shines. Let's change the layout for a phone screen without touching our Markdown files.

1.  **Open your local plugin config:** `./notecard-deck/notecard-deck.config.yaml`
2.  **Modify the `pdf_options`** to use a vertical, phone-like aspect ratio.

**File: `notecard-deck/notecard-deck.config.yaml` (Updated)**

```yaml
plugin_name: "notecard-deck"
version: "1.0.0"
protocol: "v1"

description: "A plugin to compile a directory of Markdown notecards into a single PDF deck."
handler_script: "index.js"

css_files:
  - "notecard-deck.css"

pdf_options:
  # The only change is here: from 'format' to specific dimensions.
  width: "4in"
  height: "7.1in" # ~16:9 aspect ratio
  margin:
    top: "0.25in"
    right: "0.25in"
    bottom: "0.25in"
    left: "0.25in"

# We define a custom argument for our `generate` command here.
watch_sources:
  - type: "directory"
    path_from_cli_arg: "cardsDir"
```

### Step 5: Sync and Re-Generate

Sync the configuration change to your managed plugin.

**Command:**

```bash
oshea collection update _user_added_plugins
```

Now, run the `generate` command again, but give the output a new name.

**Command:**

```bash
oshea generate notecard-deck --cards-dir ./my-notecards --outdir ./output --filename mobile-deck.pdf
```

### Step 6: Compare the Results

You now have two PDFs in your `output/` directory:

  * `notecard-deck.pdf`: Formatted for standard paper.
  * `mobile-deck.pdf`: Formatted for a phone screen.

Open both to see how the layout changed dramatically while the content, sourced from your simple Markdown files, remained untouched. This workflow allows you to maintain one set of content and effortlessly publish it to different formats.
