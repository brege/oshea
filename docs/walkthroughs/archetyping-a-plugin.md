# Walkthrough: Customizing a Plugin with Archetyping

This guide demonstrates how to create a new plugin by "archetyping" from an existing one, modifying its CSS for a custom look, and then using it to convert a document. This is a common workflow for developers who want to create a new document style that is a variation of a bundled plugin.

We will create a custom CV plugin with a different color scheme.

### Prerequisites

  * `oshea` installed.
  * A sample CV document. You can use the one from the bundled `cv` plugin located at [`plugins/cv/example.md`](../../plugins/cv/example.md). Copy it to your current directory and rename it to `my-cv.md`.

---

### Step 1: Create a New Plugin from the `cv` Archetype

First, we'll use the `plugin create` command with the `--from` option to create a new plugin named `my-cv` based on the bundled `cv` plugin.

**Command:**

```bash
oshea plugin create my-cv --from cv
```

**Explanation:**

  * This command scaffolds a new directory named `my-cv/` in your current location.
  * It copies all the files from the bundled `cv` plugin, including its configuration and CSS, and renames them appropriately.

You now have a fully functional, independent plugin at `./my-cv/` that is a perfect copy of the original.

---

### Step 2: Modify the Plugin's CSS

Now, let's customize the appearance. We'll edit the CSS file of our new plugin to change the color of the main heading.

1.  **Open the CSS file:** `my-cv/style.css`
2.  **Find the `h1` style definition.**
3.  **Change the `color` property.**

Here is the complete content for the modified `my-cv/style.css` file. The only change is the `color` in the `h1, h2, h3, h4, h5, h6` block.

**File: `my-cv/style.css`**

```css
/* style.css */

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 9pt;
  line-height: 1.45;
  margin: 1cm; /* Note: Puppeteer margins from default.yaml will likely define the PDF's printable area. */
              /* This body margin primarily affects direct HTML viewing. */
}

a {
  color: rgb(0, 0, 0, 0.75);
  text-decoration: none;
}

h1, h2, h3, h4, h5, h6 {
  color: #8B0000; /* Dark Red - This is our custom change */
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

h1 { font-size: 1.8em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.2em; }
h4 { font-size: 1em; }
h5 { font-size: 0.9em; }
h6 { font-size: 0.8em; }

p {
  margin-top: 0; /* Consistent with other CSS files */
  margin-bottom: 1em;
}

ul, ol {
  margin-top: 0.8em;
  margin-bottom: 0.8em;
  padding-left: 1.5em;
}

li {
  margin-bottom: 0.4em;
}

strong {
  font-weight: bold;
}

/* Consistent code block styling with style.css */
code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  background-color: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em; /* Slightly smaller for code */
}

pre {
  background-color: #f0f0f0;
  border: 1px solid #cccccc;
  padding: 1em;
  overflow-x: auto;
  border-radius: 4px;
  font-size: 0.9em; /* Match code font size or set as desired */
  margin-top: 0.5em;  /* Added for spacing */
  margin-bottom: 1em; /* Added for spacing */
}

pre code {
  background-color: transparent;
  padding: 0;
  border: none;
  font-size: inherit; /* Inherit from <pre> */
}

blockquote {
  border-left: 4px solid #ccc;
  padding-left: 1em;
  margin-left: 1em; /* Keep margin-left for blockquote indentation */
  margin-top: 1em;
  margin-bottom: 1em;
  font-style: italic;
}

/* Print specific styles */
@media print {
  @page {
    margin: 1cm; /* This should ideally match default.yaml for 'cv' type if preferCSSPageSize were true */
  }

  body {
    font-size: 9pt; /* Maintain CV font size for print */
    color: #000 !important;
    background-color: #fff !important;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }

  a {
    color: rgb(0, 0, 0, 0.75) !important; /* Maintain link color style for CV if desired, or use #000 */
    text-decoration: none !important;
  }

  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid; /* Good for headings */
  }

  p, ul, ol, blockquote, pre, figure, table { /* Added p, figure, table */
    page-break-inside: avoid; /* Good for content blocks */
  }

  img {
    max-width: 100% !important; /* Ensure images scale down */
    display: block;
    margin: 0.5em auto;
  }

  .no-print {
    display: none !important;
  }
}
```

---

### Step 3: Add and Enable the Custom Plugin

Now, add your new, locally-modified plugin to **oshea**'s managed plugin root. This command installs the plugin and automatically enables it for use.

**Command:**

```bash
oshea plugin add ./my-cv
```

**Explanation:**

  * `plugin add`: This command is for adding "singleton" plugins from a local directory. It handles validation, copying the files to the managed directory, and enabling the plugin, all in one step.
  * `./my-cv`: The path to your new plugin directory.

---

### Step 4: Use Your Custom Plugin

You can now convert your CV document using the newly created and enabled `my-cv` plugin.

**Command:**

```bash
oshea convert my-cv.md --plugin my-cv --outdir ./output
```

---

### Step 5: Verify the Result

Open the generated PDF located at `output/my-cv.pdf`. You should see that the main headings are now dark red, reflecting the change you made to the CSS. This confirms that your custom plugin was used successfully.

This workflow—archetype, modify, add—is a powerful way to quickly create and deploy custom document styles tailored to your specific needs.
