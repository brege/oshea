---
cli_help: |
  Plugin: recipe
  Description: Handles individual recipe documents.

  Features:
    - Formats recipes for easy reading and printing.
    - Supports common recipe sections like Ingredients and Directions.
    - Uses specific CSS for a clean recipe layout.

  Front Matter Fields:
    - title: (string) The name of the recipe. Used for PDF metadata and as the main H1 heading.
    - author: (string, optional) The author or source of the recipe.
    - date: (string or date, optional) Date of creation or last update.
    - tags: (array of strings, optional) Keywords for the recipe.
    - (Other custom fields relevant to recipes can be used as placeholders)

  Configuration Notes (recipe.config.yaml):
    - css_files: Specifies the CSS to use (e.g., "recipe.css").
    - pdf_options: Controls page size, margins, etc.
    - remove_shortcodes_patterns: Can be used to clean Hugo-specific or other shortcodes.

  Example Usage:
    oshea convert my_favorite_recipe.md --plugin recipe
---

# Recipe Plugin (`recipe`)

This plugin is tailored for converting Markdown files formatted as individual recipes into well-structured PDF documents.

It uses front matter for metadata/placeholders and applies specific styling to make ingredients, directions, and other recipe elements clear and easy to follow.
