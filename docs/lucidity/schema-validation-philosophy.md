# Schema Validation Philosophy & Implementation Guide

> **Historical Note:** This document captures the guiding philosophy behind the plugin validation system, which was developed as part of the v0.9 "Standardization Phase". It explains the "warn, don't fail" approach that shaped the implementation of the `plugin-validator` and the `base-plugin.schema.json` contract.

This document outlines the philosophy and intended implementation of configuration schema validation within `md-to-pdf`. Its primary purpose is to ensure the system is robust and helpful without creating an overly strict environment that stifles customization or becomes a barrier to entry for new plugin developers.

## Guiding Principle: Warn, Don't Fail

The core principle of our validation system is to **warn the user of errors, but never to fail a conversion because of them**.

The `md-to-pdf` tool has a robust, layered configuration system with built-in fallbacks. This is a feature, not a bug. Schema validation will augment this system, not replace it.

### Example Scenario -- The Typo

Consider a user who makes a typo in their plugin's configuration:

**`plugins/cv/cv.config.yaml`**
```yaml
pdf_options:
  frmat: "A4" # Typo for 'format'
```

**The Wrong Approach (Strict Failure):**
A strict validation system would see that `frmat` is not a valid property, halt the entire process, and exit with an error. The user is blocked from getting their PDF due to a minor mistake.

**Our Intended Approach (Warning and Fallback)**

The `md-to-pdf` tool will instead:
1. **Validate:** The validator will see the unknown `frmat` property.
2. **Warn:** It will print a clear, helpful warning to the console:
  > `WARN: Configuration for plugin 'cv' has an unknown property "frmat" in pdf_options. Did you mean "format"?`
3. **Proceed:** The conversion will continue. The invalid `frmat` key will be ignored by the configuration merger.
4. **Fallback:** The system's existing fallback logic will apply. It will find the `format: "Letter"` setting from a lower-precedence configuration (e.g., the global defaults) and use that instead.
5. **Inform:** The user still gets their PDF, but they also get a clear message explaining why it might not look exactly as they intended and how to fix it. We can even enhance the warning to suggest a diagnostic command:
  > `INFO: To see the final applied settings, run 'md-to-pdf config --plugin cv'.`

This approach respects the user's intent to get a document, while helping them improve their configuration for next time.

## A Two-Level Schema System -- Base + Optional Extensions

To address the concern about maintenance overhead and the barrier to entry, we will **not** require every plugin to have a complex, unique schema.

1. **A Single `base-plugin.schema.json`:**
  * We will create one central, **general schema** that defines the "core contract" for *all* plugins.
  * This base schema will cover common properties like `description`, `handler_script`, and `css_files`.
  * A new plugin will be considered valid simply by adhering to this base schema. **No plugin-specific schema is required.** This keeps the barrier to entry very low.

2. **Optional `<plugin-id>.schema.json` for Extensions:**
  * A plugin author can *optionally* create a `<plugin-id>.schema.json` file for their specific plugin.
  * This file will **inherit or extend** the base schema.
  * Its purpose is to add rules that are unique to that plugin (e.g., requiring a new `invoice_number` field for an `invoice` plugin) or to make a base rule stricter (e.g., restricting `pdf_options.format` to only `"A4"`).

This hybrid approach ensures all plugins meet a minimum standard, without forcing unnecessary boilerplate on simple plugins.

## Allowing for Extensibility w/ `additionalProperties`

A key concern is that a strict schema for `pdf_options` could limit the tool's future use (e.g., for generating web pages with different options).

We will solve this by using the JSON Schema property **`"additionalProperties": true`**.

* In our base schema for `pdf_options`, we will explicitly define common, known properties like `format`, `margin`, `printBackground`, etc. This allows the validator to catch typos in these known keys.
* By also including `"additionalProperties": true`, we tell the validator: "It is perfectly okay if there are other properties here that are not on my list. Do not flag them as errors."

This gives us the perfect balance:
* We **catch typos** on common properties.
* We **allow for infinite extensibility** with custom or future properties without generating warnings or errors.
