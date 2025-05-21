---
title: "My Awesome Document"
author: "Your Name"
date: "{{ .CurrentDateISO }}" # Dynamic date
tags: ["notes", "project-x"]
custom_field: "Hello World"
---

# {{ title }}

Authored by: {{ author }} on {{ date }}.

Custom: **{{ custom_field }}**

Today's long date: {{ .CurrentDateFormatted }}
