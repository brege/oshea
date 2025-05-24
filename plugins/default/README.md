---
cli_help: |
  Plugin: default
  Description: The standard plugin for converting general Markdown documents to PDF.

  Features:
    - Handles common Markdown syntax.
    - Uses basic, clean styling suitable for a wide range of documents.
    - Supports standard front matter fields for metadata (title, author, date).

  Front Matter Fields:
    - title: (string) Document title. Used for PDF metadata and often as the main H1 heading if 'inject_fm_title_as_h1' is true.
    - author: (string) Document author. Used for PDF metadata.
    - date: (string or date) Document date. Used for PDF metadata.
    - (Any other custom front matter fields can be used as placeholders in the Markdown content if using DefaultHandler)

  Configuration Notes (default.config.yaml):
    - css_files: Specifies the CSS to use (e.g., "default.css").
    - pdf_options: Controls page size (default Letter), margins, etc.
    - inject_fm_title_as_h1: (boolean) If true, uses the 'title' from front matter as H1.
    - math: (object) KaTeX math rendering can be enabled/configured here.
    - toc_options: (object) Table of Contents generation can be enabled/configured.

  Example Usage:
    md-to-pdf convert my_document.md
    md-to-pdf convert my_document.md --plugin default
---

# Default Plugin (`default`)

This is the standard, general-purpose plugin for `md-to-pdf`. It's designed to handle a wide variety of Markdown documents and provides a clean, readable PDF output.

It serves as a good base for understanding basic plugin functionality and can be easily customized via XDG or project-level configuration overrides.
