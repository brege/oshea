---
title: "Jane Doe - Curriculum Vitae"
author: "Jane Doe"
date: "{{ .CurrentDateISO }}"
oshea_plugin: "./default.yaml"
# Additional CV-specific front matter can be added here if your default.yaml
# or style.css expects them, e.g., for placeholders.
# contact_email: "jane.doe@example.com"
# contact_phone: "555-123-4567"
---

# {{ title }}

{{ author }} | {{ date }}

This is an example CV document to demonstrate the **`cv`** plugin. It uses the `oshea_plugin: "./default.yaml"` key in its front matter, so it will automatically use the `cv` plugin's configuration when you run `oshea example.md` from within the `plugins/cv/` directory.

The `cv` plugin is designed for creating professional-looking Curriculum Vitae documents.

---

## Summary

A brief summary of professional background and objectives. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Experience

### Senior Widget Engineer | Acme Corp | 2020 - Present
* Developed advanced widget solutions.
* Led a team of widgeteers.

### Widget Intern | Anytown Widgets | 2019 - 2020
* Assisted in widget design and testing.

## Education

### M.S. Widgetry | University of Advanced Studies | 2019
* Thesis: *The Future of Widgets*

### B.S. Applied Widget Design | State College | 2017

## Skills

* Widget Engineering
* Advanced Gadgetry
* Problem Solving
* Team Leadership

---

For using the `cv` plugin with *other* Markdown documents by its name from any directory (e.g., `oshea convert my_actual_cv.md --plugin cv`), ensure it's registered in a main `oshea` configuration file. (It usually is by default in `config.example.yaml`).
