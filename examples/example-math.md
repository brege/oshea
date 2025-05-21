---
title: "Math Test Document"
plugin: default # or any plugin that uses DefaultHandler
---

# Math Rendering Test

This is an inline formula: $E = mc^2$.

This is a display formula:
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

Another inline using different delimiters: \( \sum_{i=1}^n i = \frac{n(n+1)}{2} \)

Another display formula:
\[
\mathcal{L} \{f(t)\} = F(s) = \int_0^\infty e^{-st} f(t) dt
\]

Testing macros (if defined in config.example.yaml, e.g., `\RR`):
The set of real numbers is denoted by $\RR$.
If `\RR` is not defined, it will render as `\RR`.

