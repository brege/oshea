---
title: "Cover Letter Example - John Applicant"
author: "John Applicant"
date: "{{ .CurrentDateISO }}"
md_to_pdf_plugin: "./cover-letter.config.yaml"

# Example front matter fields that a cover letter might use as placeholders
# (These would be defined by the user in their actual cover letter Markdown)
yourName: "John Applicant"
yourAddress: "123 Main Street, Anytown, USA 12345"
yourPhone: "555-0100"
yourEmail: "john.applicant@example.com"

recipientName: "Hiring Manager"
recipientTitle: "Talent Acquisition Lead"
companyName: "Tech Solutions Inc."
companyAddress: "456 Innovation Drive, Techville, USA 67890"

salutation: "Dear Hiring Manager,"
closing: "Sincerely,"
---

# {{ title }}

{{ yourName }}
{{ yourAddress }}
Phone: {{ yourPhone }}
Email: {{ yourEmail }}

{{ CurrentDateFormatted }}

{{ recipientName }}
{{ recipientTitle }}
{{ companyName }}
{{ companyAddress }}

{{ salutation }}

This is an example cover letter to demonstrate the **`cover-letter`** plugin. It uses the `md_to_pdf_plugin: "./cover-letter.config.yaml"` key in its front matter. This means it will automatically use the `cover-letter` plugin's specific configuration (like paper size, margins, and CSS optimized for letters) when you run `md-to-pdf cover-letter-example.md` from within the `plugins/cover-letter/` directory.

The main body of the cover letter would go here. This section would typically outline the applicant's interest in a specific role, highlight relevant skills and experiences, and express enthusiasm for the company. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

I am confident that my skills and experience make me a strong candidate for this opportunity. I have attached my resume for your review and welcome the chance to discuss my qualifications further.

{{ closing }}

{{ yourName }}

---

For using the `cover-letter` plugin with *your actual* cover letter Markdown files from any directory (e.g., `md-to-pdf convert my_actual_cover_letter.md --plugin cover-letter`), ensure it's registered in a main `md-to-pdf` configuration file. (It is usually registered by default in `config.example.yaml`).
