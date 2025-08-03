---
cli_help: |
  Plugin: advanced-card (Example Plugin)
  Description: An advanced example plugin demonstrating custom HTML generation and dynamic content.

  Features:
    - Generates a business card PDF with a highly custom layout.
    - Reads main card content (name, title) directly from the Markdown body (e.g., H1, H2).
    - Uses front matter for auxiliary data (e.g., website URL for QR code, branding colors).
    - Dynamically generates a QR code image URL.
    - Bypasses DefaultHandler to construct its own HTML.

  Front Matter Fields (Examples):
    - website: (string) URL used for QR code if 'qr_data' is not set.
    - qr_data: (string) Specific data for the QR code (e.g., mailto link, vCard info).
    - brandingColor: (string) Hex color code for custom branding elements.

  Configuration Notes (advanced-card.config.yaml):
    - css_files: Specifies CSS for the custom HTML structure (e.g., "advanced-card.css").
    - pdf_options: Defines specific dimensions (width, height) for the card, small margins.
    - inject_fm_title_as_h1: false (as H1 comes from Markdown body).
    - printBackground: true (important for card designs with background colors).

  Example Usage (assuming registered):
    oshea convert path/to/advanced-card-example.md --plugin advanced-card
---

# Advanced Card Plugin (`advanced-card`) - Example

This `advanced-card` plugin is a demonstration of advanced plugin capabilities within `oshea`. It showcases how to:

1.  Read primary content directly from the Markdown body (e.g., using H1 for name, H2 for title).
2.  Utilize front matter for supplementary data like QR code information or branding colors.
3.  Dynamically generate content, such as a QR code image URL.
4.  Construct a fully custom HTML structure, bypassing the `DefaultHandler`.
5.  Load its own specific CSS to style this custom HTML.
6.  Directly call the PDF generation utility with the custom HTML and precise PDF options (like business card dimensions).

It serves as an educational example for developers looking to create plugins with highly specific output requirements beyond standard Markdown-to-HTML conversion.

**Location:** `plugins/advanced-card/`
