---
cli_help: |
  Plugin: default
  Description: The standard plugin for converting general Markdown documents to PDF.

  Features:
    - Handles common Markdown syntax.
    - Uses basic, clean styling suitable for a wide range of documents.
    - Supports standard front matter fields for metadata (title, author, date).

  Front Matter Fields:
    - title: (string) Document title. Used for PDF metadata and available to templates/placeholders.
    - author: (string) Document author. Used for PDF metadata.
    - date: (string or date) Document date. Used for PDF metadata.
    - (Any other front matter fields can be used as placeholders in Markdown content)

  Configuration Notes (default.yaml):
    - css_files: Specifies the CSS to use (e.g., "style.css").
    - pdf_options: Controls page size (default Letter), margins, etc.
    - math: (object) KaTeX math rendering can be enabled/configured here.
    - toc_options: (object) Table of Contents generation can be enabled/configured.

  Example Usage:
    oshea convert my_document.md
    oshea convert my_document.md --plugin default
---

# Default Plugin (`default`)

This is the standard, general-purpose plugin for `oshea`. It's designed to handle a wide variety of Markdown documents and provides a clean, readable PDF output.

It serves as a good base for understanding basic plugin functionality and can be easily customized via XDG or project-level configuration overrides.
