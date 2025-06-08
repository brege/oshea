---
title: "{{ title_param }}"
author: "Author From Front Matter" # Should override author_param from any config
shared_param: "Value From Front Matter" # Should override shared_param from any config
fm_only_param: "This is only in Front Matter"
---

# {{ title }}

By: {{ author }}

Shared Parameter: {{ shared_param }}

Front Matter Only Parameter: {{ fm_only_param }}

Config Parameter (Expect Project or Base): {{ config_specific_param }}

Site URL (Expect Project or Base): {{ site.url }}

Deeply Nested (Expect Project or Base): {{ deeply.nested.value }}

Fallback Param (from Project if used, else Base): {{ fallback_param }}

Date Check: {{ .CurrentDateFormatted }}
