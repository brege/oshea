# Recipe Book Plugin (`recipe-book`)

The `recipe-book` plugin is designed to collect multiple individual recipe Markdown files, each typically residing in its own subdirectory with an `index.md` file, and compile them into a single, cohesive PDF document.

It supports features like an auto-generated cover page and a table of contents. This plugin is usually invoked with the `oshea generate recipe-book ...` command, requiring the `--recipes-base-dir` option to specify the location of the recipe files.
