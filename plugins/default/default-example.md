---
title: "Default Plugin Example Document"
author: "A User"
date: "{{ .CurrentDateISO }}"
oshea_plugin: "./default.config.yaml"
# You can add other params here that your 'default' plugin might use
# from its 'params' section in default.config.yaml or from global params.
# example_param: "Hello from Default Example"
---

# {{ title }}

This is an example document to demonstrate the **`default`** plugin. It uses the `oshea_plugin: "./default.config.yaml"` key in its front matter, so it will automatically use the `default` plugin's configuration when you run `oshea default-example.md` from within the `plugins/default/` directory.

The `default` plugin is designed for general-purpose Markdown documents. It provides clean styling and supports standard Markdown features.

## Features to Test:

* Standard paragraph text.
* **Bold** and _italic_ text.
* Bullet lists:
    * Item 1
    * Item 2
* Numbered lists:
    1.  First item
    2.  Second item
* [A link to an example website](https://example.com)
* `Inline code`

```javascript
// A code block
function greet(name) {
  console.log("Hello, " + name + "!");
}
```

> A blockquote to see how it's styled.

---

For using the `default` plugin with *other* Markdown documents by its name from any directory (e.g., `oshea convert another.md --plugin default`), ensure it's registered in a main `oshea` configuration file. (It usually is by default in `config.example.yaml`).


