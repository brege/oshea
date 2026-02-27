---
cli_help: |
  Plugin: cv
  Description: Handles the conversion of Curriculum Vitae (CV) or Resume Markdown files to PDF.

  Features:
    - Optimized for professional CV/resume layouts.
    - Expects H1 to be your name, followed by contact details.
    - Uses specific CSS for clean, readable output.

  Front Matter Fields:
    - title: (string) Your full name. Used for PDF metadata and available to templates/placeholders.
    - author: (string) Your name (can be same as title). For PDF metadata.
    - date: (string or date) Date of last update. For PDF metadata.
    - (Other custom fields you might use in your CV Markdown that your template/CSS might expect)

  Configuration Notes (cv.config.yaml):
    - css_files: Specifies the CSS to use (e.g., "cv.css").
    - pdf_options: Controls page size (default A4), margins, etc.

  Example Usage:
    oshea convert my_cv.md --plugin cv
---

# CV Plugin (`cv`)

This plugin is designed for converting Markdown files formatted as a Curriculum Vitae (CV) or resume into a professional-looking PDF document.

It uses front matter for metadata/placeholders and applies specific styling for sections like "Experience," "Education," and "Skills."
