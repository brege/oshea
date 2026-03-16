# Advanced Card Plugin (`advanced-card`) - Example

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="./screenshot.png" width="50%">
        <br><strong>Advanced Card Sample</strong>
      </td>
    </tr>
  </table>
</div>

This `advanced-card` plugin is a demonstration of advanced plugin capabilities within `oshea`. It showcases how to:

1.  Read primary content directly from the Markdown body (e.g., using H1 for name, H2 for title).
2.  Utilize front matter for supplementary data like QR code information or branding colors.
3.  Dynamically generate content, such as a QR code image URL.
4.  Construct a fully custom HTML structure, bypassing the `DefaultHandler`.
5.  Load its own specific CSS to style this custom HTML.
6.  Directly call the PDF generation utility with the custom HTML and precise PDF options (like business card dimensions).

It serves as an educational example for developers looking to create plugins with highly specific output requirements beyond standard Markdown-to-HTML conversion.

**Location:** `plugins/advanced-card/`
