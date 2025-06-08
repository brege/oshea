---
title: "FM Specifies CV Plugin"
md_to_pdf_plugin: "cv"
author: "FM Test Author"
date: "2025-05-26"
---

# Document Title: {{ title }}

This document explicitly requests the 'cv' plugin via its front matter.
It should be styled like a CV, according to the 'cv' plugin's configuration
(potentially overridden by `test/config.test.yaml` for aspects like PDF format if not specified by 'cv' itself).

Author: {{ author }}
Date: {{ date }}
