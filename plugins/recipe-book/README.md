---
cli_help: |
  Plugin: recipe-book
  Description: Compiles multiple individual recipe Markdown files into a single PDF recipe book.

  Features:
    - Aggregates recipes from a specified directory.
    - Can automatically generate a cover page.
    - Can automatically generate a table of contents.
    - Applies consistent styling across all recipes in the book.

  Command-Line Invocation (Typically used with 'generate'):
    oshea generate recipe-book --recipes-base-dir <path_to_recipes_folder> [options]

  Required CLI Option for 'generate':
    --recipes-base-dir <path>: Specifies the directory containing subdirectories, where each subdirectory has an 'index.md' for a recipe.

  Configuration Notes (recipe-book.config.yaml):
    - css_files: Lists CSS files (e.g., "recipe.css", "recipe-book.css").
    - pdf_options: Page size, margins for the book.
    - cover_page: (object) Settings to enable and customize the cover page (title, subtitle, author).
    - toc_options: (object) Settings to enable and customize the table of contents.
    - remove_shortcodes_patterns: Useful for cleaning up Hugo shortcodes if recipes are sourced from Hugo.
    - watch_sources: Configured to watch the 'recipesBaseDir' provided via CLI.

  Example Usage:
    oshea generate recipe-book --recipes-base-dir ./my_recipes_collection --filename "MyCookbook.pdf"
---

# Recipe Book Plugin (`recipe-book`)

The `recipe-book` plugin is designed to collect multiple individual recipe Markdown files, each typically residing in its own subdirectory with an `index.md` file, and compile them into a single, cohesive PDF document.

It supports features like an auto-generated cover page and a table of contents. This plugin is usually invoked with the `oshea generate recipe-book ...` command, requiring the `--recipes-base-dir` option to specify the location of the recipe files.
