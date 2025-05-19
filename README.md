# Markdown to PDF Converter (md-to-pdf)

A versatile Node.js command-line tool to convert Markdown files into professionally styled PDFs. Ideal for CVs, cover letters, recipes, recipe books, and batch exporting Hugo content. It leverages `markdown-it` for robust Markdown parsing and Puppeteer (headless Chromium) for high-quality PDF generation.

## Features

* Convert single Markdown files to PDF with type-specific styling (CV, Cover Letter, Recipe, etc.).
* Generate a combined PDF recipe book from a directory of Markdown recipe files, including an optional cover page and table of contents.
* Batch export individual PDFs from a Hugo content directory (e.g., recipes), with customizable slug-author-date naming conventions.
* Highly configurable via a `config.yaml` file for global and document-type-specific settings (CSS, PDF options, shortcode removal, and more).
* Supports front matter (YAML) in Markdown files for metadata and dynamic content substitution.
* Automatic H1 heading injection from front matter title (configurable per type).
* Customizable CSS for fine-grained control over PDF appearance.

## Prerequisites

* **Node.js:** Version 18.0.0 or higher is recommended. Download from [nodejs.org](https://nodejs.org/).
* **npm (Node Package Manager):** Usually included with Node.js. Used for installing project dependencies.

## Installation

1.  **Clone the repository (or download the source):**
    ```bash
    git clone https://github.com/brege/md-cv-to-pdf.git
    cd md-cv-to-pdf
    ```

2.  **Install dependencies:**
    This command installs necessary packages including `yargs`, `js-yaml`, `gray-matter`, `markdown-it`, and `puppeteer`. Puppeteer will also download a compatible version of Chromium (this might take a few minutes on the first run).
    ```bash
    npm install
    ```

3.  **Configuration:**
    * Copy the example configuration file to create your own working configuration:
        ```bash
        cp config.example.yaml config.yaml
        ```
    * Review and customize `config.yaml` to suit your needs (e.g., `pdf_viewer` command, default PDF options, document type settings). See the "Configuration" section below and the comments within `config.example.yaml` for details.

4.  **(Optional) Make the CLI globally available:**
    If you want to run the command as just `md-to-pdf` from any directory, you can link the package globally:
    ```bash
    sudo npm link 
    ```
    Alternatively, you can run it from the project root using `node cli.js ...` or `npx . ...`.

## Usage

The primary interface is `cli.js`. If you've linked the package globally, you can use `md-to-pdf`. Otherwise, from the project root, use `node cli.js`.

**Global Option:**

* `--config <path_to_config.yaml>`: Specify a custom path to a YAML configuration file. If not provided, the tool looks for `config.yaml` in the directory where `cli.js` is located (project root).

    Example: `node cli.js convert mydoc.md --config /path/to/my/custom_config.yaml`

### Commands

#### 1. `convert <markdownFile>`

Converts a single Markdown file to PDF.

**Syntax:**
```bash
node cli.js convert <markdownFile> [options]
# or if globally linked:
# md-to-pdf convert <markdownFile> [options]
```

**Arguments & Options:**

  * `<markdownFile>`: (Required) Path to the input Markdown file.
  * `-o, --outdir <directory>`: Output directory for the PDF. Defaults to the input file's directory.
  * `-f, --filename <name.pdf>`: Specify the exact output PDF filename. If not provided, a name will be generated based on front matter (title, author, date from the processed front matter) or the input filename if those fields are not present.
  * `-t, --type <documentType>`: Specify the document type (e.g., `cv`, `recipe`, `cover-letter`). This corresponds to a key under `document_types` in `config.yaml` and determines CSS, PDF options, and other type-specific settings. Defaults to `default`.
  * `--no-open`: Prevents automatically opening the generated PDF, even if a `pdf_viewer` is configured in `config.yaml`.

**Examples:**

  * Convert a CV using settings for the `cv` type:
    ```bash
    node cli.js convert examples/example-cv.md --type cv
    ```
  * Convert a recipe to a specific output directory and force a filename:
    ```bash
    node cli.js convert examples/example-recipe.md --type recipe --outdir ./output_pdfs --filename my-awesome-dish.pdf
    ```
  * Convert a cover letter using the default output directory:
    ```bash
    node cli.js convert examples/example-cover-letter.md --type cover-letter
    ```

#### 2\. `book <recipesBaseDir>`

Creates a single, combined PDF recipe book from a directory of recipe Markdown files. Recipes are typically expected to be in subdirectories of `<recipesBaseDir>`, each containing an `index.md` file (Hugo-like structure).

**Syntax:**

```bash
node cli.js book <recipesBaseDir> [options]
```

**Arguments & Options:**

  * `<recipesBaseDir>`: (Required) Path to the base directory containing recipe Markdown files/subdirectories.
  * `-o, --outdir <directory>`: Output directory for the recipe book PDF. Defaults to the current working directory (`.`).
  * `-f, --filename <name.pdf>`: Specific name for the output recipe book PDF. Defaults to `recipe-book.pdf`.
  * `--no-open`: Prevents automatically opening the generated PDF.

**Example:**

  * Create a recipe book from recipes located in `examples/hugo-example/`:
    ```bash
    node cli.js book examples/hugo-example --outdir ./my_cookbooks --filename "Family Favorites Cookbook.pdf"
    ```

#### 3\. `hugo-export-each <sourceDir>`

Batch exports individual PDFs from a Hugo content directory (e.g., a directory of recipes). PDFs are typically named using a "slug-author-date.pdf" convention and saved alongside their source Markdown files by default.

**Syntax:**

```bash
node cli.js hugo-export-each <sourceDir> [options]
```

**Arguments & Options:**

  * `<sourceDir>`: (Required) Path to the source directory containing Hugo content items (e.g., `my-hugo-site/content/recipes`).
  * `-t, --base-type <documentType>`: The base document type from `config.yaml` (e.g., `recipe`) to use for styling and PDF options for each exported item. Defaults to `recipe`.
  * `--hugo-ruleset <rulesetName>`: The key in `config.yaml` under the `hugo_export_each` section that defines specific processing rules (like author extraction regex and Hugo-specific shortcode removal) for this batch export. Defaults to `default_rules`.
  * `--no-open`: Prevents automatically opening the generated PDFs. For this batch command, the default is `true` (PDFs are *not* opened automatically). Set to `--no-open=false` to attempt opening (e.g., the first one).

**Example:**

  * Export all recipes from a Hugo content directory using the `recipe` type for styling and the `default_rules` for Hugo processing:
    ```bash
    node cli.js hugo-export-each path/to/hugo/content/posts --base-type recipe --hugo-ruleset default_rules
    ```

## Configuration (`config.yaml`)

The application's behavior is heavily controlled by `config.yaml`. You should copy `config.example.yaml` to `config.yaml` and customize it. The `config.example.yaml` file is thoroughly commented to explain all available options.

Key sections include:

  * **`pdf_viewer`**: Command to open PDFs (e.g., `firefox`, `evince`, or `null` to disable).
  * **`global_pdf_options`**: Default Puppeteer PDF options (e.g., `format`, `margin`, `printBackground`, `headerTemplate`, `footerTemplate`, `displayHeaderFooter`).
  * **`global_remove_shortcodes`**: An array of regular expression patterns (as strings) to remove content globally from all documents *before* Markdown rendering.
  * **`document_types`**: Define configurations for different types of documents (e.g., `default`, `cv`, `recipe`, `recipe-book`, `cover-letter`). Each type can specify:
      * `description`: A brief note about the type.
      * `css_files`: An array of CSS filenames (expected in the `css/` directory) to apply for styling.
      * `pdf_options`: Type-specific overrides for `global_pdf_options`.
      * `toc_options`: Settings for table of contents generation (e.g., `enabled`, `placeholder` string in Markdown, `level` of headings to include, `listType`).
      * `cover_page`: (Primarily for `recipe-book`) Settings for an automatically generated cover page (`enabled`, `title`, `subtitle`, `author`).
      * `remove_shortcodes_patterns`: Type-specific regex patterns for shortcode removal, applied after any `global_remove_shortcodes`.
      * `inject_fm_title_as_h1`: (Boolean) If `true`, the `title` from the document's front matter will be injected as the main H1 heading.
      * `aggressiveHeadingCleanup`: (Boolean) If `inject_fm_title_as_h1` is `true`, setting this also to `true` will attempt to remove any pre-existing H1 or H2 headings from the Markdown content before injecting the new title. This is useful for recipe book items or content where titles might already exist in the body.
  * **`hugo_export_each`**: Configuration specific to the `hugo-export-each` command. This section contains one or more "rulesets" (e.g., `default_rules`). Each ruleset can define:
      * `author_extraction_regex`: A regex (as a string) to extract author name(s) from the *body content* of the Markdown file (not from front matter). The first capture group is used.
      * `author_is_list_regex`: An optional regex (as a string) to check if the full line matched by `author_extraction_regex` implies multiple authors (e.g., "Chefs:" vs "Chef:"). If it matches and multiple authors are implied by comma separation in the captured group, the author slug may be formatted as "firstauthor-et-al".
      * `additional_shortcodes_to_remove`: An array of regex patterns for Hugo-specific shortcodes that should be removed from items processed by this command. These are applied after `global_remove_shortcodes`.

## CSS Styling

  * Create your custom CSS files and place them in the `css/` directory at the project root.
  * In `config.yaml`, link these CSS files to your document types using the `css_files` array (e.g., `css_files: ["common.css", "recipe_specific.css"]`).
  * The order of CSS files in the array matters for the cascade.
  * A basic `css/default.css` is provided as a starting point. Other examples like `cv.css`, `recipe.css`, etc., are also included.

## Front Matter and Placeholders

Markdown files can include YAML front matter at the beginning for metadata and to enable dynamic content substitution within the document.

**Example Front Matter:**

```yaml
---
title: "My Awesome Document"
author: "John Doe"
date: "2025-05-18" # Can be a fixed date or a placeholder
custom_var: "Some Custom Value"
# 'type' in front matter is not currently used to select config; use --type CLI arg.
---

The rest of your Markdown content goes here. You can use placeholders like {{ .custom_var }} or {{ .CurrentDateFormatted }}.
```

**Dynamic Placeholders:**

The system supports substituting placeholders in your Markdown content and also within string values in your front matter itself. This allows for creating dynamic and reusable templates.

  * **Syntax:** Placeholders use the format `{{ .key }}` or `{{ .path.to.key }}` (e.g., `{{ .contact.email }}`). The leading dot `.` indicates the root of the data context (which is the processed front matter).

  * **Front Matter Referencing:** You can reference other front matter keys within front matter string values:

    ```yaml
    ---
    person:
      firstName: "Jane"
      lastName: "Doe"
    greeting: "Hello, {{ .person.firstName }}!"
    documentTitle: "Status Report - {{ .person.lastName }}, {{ .person.firstName }}"
    ---
    ```

  * **Automatic Date Placeholders:** Two special date placeholders are automatically available for use in your Markdown content or front matter string values:

      * `{{ .CurrentDateFormatted }}`: Inserts the current date when the script is run, in a long, human-readable format (e.g., "May 18, 2025").
      * `{{ .CurrentDateISO }}`: Inserts the current date in `YYYY-MM-DD` format.

    **Example (Cover Letter):**

    ```yaml
    ---
    # In your Markdown front matter:
    applicantName: "Dr. Jane Doe"
    jobId: "XYZ-123"
    date: "{{ .CurrentDateFormatted }}" # For display in the letter body
    # filename_date_part: "{{ .CurrentDateISO }}" # If you wanted to use it for filename logic via FM
    title: "Cover Letter - {{ .applicantName }} for {{ .jobId }}"
    ---

    **{{ .date }}**

    Dear Hiring Committee,

    I am writing to apply for position {{ .jobId }}...
    ```

    When processed, `{{ .date }}` in the body would become (e.g.) "May 18, 2025". The `title` in front matter would also resolve its placeholders.

**Filename Generation:**
When the `--filename` option is *not* used with the `convert` command, the output PDF filename is automatically generated based on available front matter fields (`title`, `author`, `date`) from the *processed* front matter, or falls back to the input Markdown filename.

## Examples

The `examples/` directory contains sample Markdown files to demonstrate various features and document types:

  * `example-cv.md`
  * `example-cover-letter.md` (demonstrates placeholder usage)
  * `example-recipe.md`
  * `hugo-example/`: A directory structured like Hugo content (subdirectories with `index.md`), useful for testing the `book` and `hugo-export-each` commands.

## Testing

The project includes an integration test suite to verify core functionality.

  * Test scripts and configurations are located in the `test/` directory.
  * To run the tests, execute the following command from the project root:
    ```bash
    npm test
    ```
  * For more details on the testing setup and how to run tests or add new ones, please refer to `test/README.md`.

## Contributing

Contributions, issues, and feature requests are welcome\! If you are an AI assistant (like Gemini) helping with the codebase, please refer to the guidelines in `GEMINI.md` for our interaction protocol.

## License

This project is licensed under the MIT License. (You might want to add a `LICENSE` file to your repository with the MIT License text if you haven't already).

