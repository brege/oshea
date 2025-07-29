---
title: "My New valid-plugin Document"
author: "Plugin User"
date: "{{ .CurrentDateISO }}"
# This line tells md-to-pdf to use the sibling .config.yaml file for this specific document.
# When 'plugin create' runs, 'valid-plugin' here will be replaced with the new plugin's name.
md_to_pdf_plugin: "./valid-plugin.config.yaml"
#
# Add any other parameters your plugin might expect or use by default
# from its params section in valid-plugin.config.yaml
# default_greeting: "Custom Greeting for this Doc!"
---

# {{ title }}

This is an example document to test a plugin created from the 'valid-plugin' template.

It uses the default handler, which should process standard Markdown features.

**How this example works:**
This example document (`valid-plugin-example.md`) is configured to automatically use its corresponding plugin configuration (`valid-plugin.config.yaml`) because of the `md_to_pdf_plugin: "./valid-plugin.config.yaml"` line in its front matter. This allows you to test the plugin immediately by running `md-to-pdf valid-plugin-example.md` from within the plugin's directory.

For using this `valid-plugin` plugin with *other* Markdown documents, or by its name from any directory, you'll typically need to register it in a main `md-to-pdf` configuration file (see your plugin's `README.md` for details on registration).

## Placeholders

* Author: {{ author }}
* Date: {{ date }}
* Formatted Date: {{ .CurrentDateFormatted }}
* Plugin Default Greeting (if defined and not overridden): {{ default_greeting }}

## Styling

The styling for this document will come from `valid-plugin.css`. You can customize this CSS file to change the appearance.
