---
title: "My New template-basic Document"
author: "Plugin User"
date: "{{ .CurrentDateISO }}"
# This line tells md-to-pdf to use the sibling .config.yaml file for this specific document.
# When 'plugin create' runs, 'template-basic' here will be replaced with the new plugin's name.
md_to_pdf_plugin: "./template-basic.config.yaml"
#
# Add any other parameters your plugin might expect or use by default
# from its params section in template-basic.config.yaml
# default_greeting: "Custom Greeting for this Doc!"
---

# {{ title }}

This is an example document to test a plugin created from the 'template-basic' template.

It uses the default handler, which should process standard Markdown features.

**How this example works:**
This example document (`template-basic-example.md`) is configured to automatically use its corresponding plugin configuration (`template-basic.config.yaml`) because of the `md_to_pdf_plugin: "./template-basic.config.yaml"` line in its front matter. This allows you to test the plugin immediately by running `md-to-pdf template-basic-example.md` from within the plugin's directory.

For using this `template-basic` plugin with *other* Markdown documents, or by its name from any directory, you'll typically need to register it in a main `md-to-pdf` configuration file (see your plugin's `README.md` for details on registration).

## Placeholders

* Author: {{ author }}
* Date: {{ date }}
* Formatted Date: {{ .CurrentDateFormatted }}
* Plugin Default Greeting (if defined and not overridden): {{ default_greeting }}

## Styling

The styling for this document will come from `template-basic.css`. You can customize this CSS file to change the appearance.
