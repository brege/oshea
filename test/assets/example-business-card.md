---
name: "John Doe"
title: "Software Engineer"
phone: "555-1234"
email: "john.doe@example.com"
website: "johndoe.dev"

# PDF metadata (optional, used by default_handler for filename if not specified)
# title: "Business Card - {{ name }}"
# author: "{{ name }}"
# date: "{{ .CurrentDateISO }}"
---

# {{ name }}

{{ title }}

{{ phone }} | {{ email }} | {{ website }}
