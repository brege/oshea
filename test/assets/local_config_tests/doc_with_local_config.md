---
title: "Document Title BEFORE Local Config Override"
test_param_markdown: "Value from Markdown Front Matter"
# No md_to_pdf_plugin here; will be picked from doc_with_local_config.config.yaml
---
# {{ title }}

This document tests the `<filename>.config.yaml` feature.
It should be processed by the **recipe plugin** and have **A6 format** with a **light green background**.

Markdown Param: `{{ test_param_markdown }}`
Local Config Param: `{{ local_config_specific_param }}`
Param from test/config.test.yaml (should be overridden if in local): `{{ shared_param }}`
Current Date: `{{ .CurrentDateFormatted }}`
