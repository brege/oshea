---
title: "Recipe Book Example Placeholder"
author: "oshea"
date: "{{ .CurrentDateISO }}"
---

# Recipe Book Example

This file, `recipe-book-example.md`, exists primarily to satisfy the `plugin validate` command's requirement that every plugin has an example file.

The `recipe-book` plugin is a "generator" plugin and does not convert a single file. Instead, it is used with the `generate` command to compile a directory of recipes into a single PDF.

### Example Usage

To generate a recipe book using the test fixtures included with the project, run the following command from the project root:

```bash
oshea generate recipe-book --recipes-base-dir ./test/fixtures/hugo-example
```
This file is not intended for direct conversion. See the `recipe-book`'s in-situ E2E test for an example of how it is programmatically invoked.
