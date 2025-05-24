---
cli_help: |
  Plugin: cover-letter
  Description: Formats professional cover letters from Markdown.

  Features:
    - Standardized layout for contact information, date, recipient details, and letter body.
    - Clean and formal styling.
    - Uses front matter extensively for populating letter fields.

  Front Matter Fields (Examples):
    - yourName: (string) Your full name.
    - yourStreetAddress: (string) Your street address.
    - yourCityStateZip: (string) Your city, state, and ZIP code.
    - yourPhone: (string) Your phone number.
    - yourEmail: (string) Your email address.
    - CurrentDateFormatted: (string, often from placeholder {{ .CurrentDateFormatted }}) The date of the letter.
    - contactPersonName: (string) Recipient's full name.
    - companyName: (string) Company you're applying to.
    - (Many other fields for recipient address, job title, etc. See example-cover-letter.md)

  Configuration Notes (cover-letter.config.yaml):
    - css_files: Specifies CSS (e.g., "cover-letter.css").
    - pdf_options: Standard page size (Letter/A4), margins suitable for formal letters.
    - inject_fm_title_as_h1: Typically false, as cover letters don't have a main H1 title in the document body. PDF metadata title comes from front matter.

  Example Usage:
    md-to-pdf convert my_application_letter.md --plugin cover-letter
---

# Cover Letter Plugin (`cover-letter`)

This plugin assists in creating professionally formatted cover letters from Markdown.

It relies heavily on YAML front matter to populate common cover letter fields such as sender and recipient contact information, dates, and salutations. The Markdown body is then used for the main content of the letter.
