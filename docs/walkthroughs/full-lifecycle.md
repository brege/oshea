# Walkthrough: A Plugin's Full Lifecycle

This guide demonstrates a complete, real-world workflow for managing plugins in **oshea**. You will add a plugin from a remote Git repository, enable it, use it to convert a document, and then clean up by disabling and removing it.

### Prerequisites

  * `oshea` installed.
  * `git` installed on your system.
  * A sample Markdown file. You can create one named `sample.md` with the content: `# My Document`.

---

### Step 1: Add a Plugin

First, add a single plugin from a remote Git repository.

**Command:**

```bash
oshea plugin add https://github.com/user/restaurant-menu-plugin
```

**Explanation:**

  * `plugin add`: Installs and enables a plugin from a local path or Git URL.
  * `https://github.com/user/restaurant-menu-plugin`: A repository containing one oshea plugin.

---

### Step 2: Enable a Plugin

Now that the plugin is installed, ensure it is enabled.

**Command:**

```bash
oshea plugin enable restaurant-menu
```

**Explanation:**

  * `plugin enable`: The command to activate a plugin.
  * `restaurant-menu`: The plugin invoke name.

By default, the plugin's "invoke name" will be `restaurant-menu`.

---

### Step 3: Use the Plugin

With the plugin enabled, you can now use it to convert your `sample.md` file.

**Command:**

```bash
oshea convert sample.md --plugin restaurant-menu --outdir ./output
```

**Explanation:**

  * `convert sample.md`: The command to convert a single Markdown file.
  * `--plugin restaurant-menu`: Specifies which active plugin to use for the conversion.
  * `--outdir ./output`: Saves the generated PDF to an `output` directory in your current folder.

You should now have a `restaurant-menu.pdf` file in the `output` directory.

---

### Step 4: Disable the Plugin

After you're done using a plugin, you can disable it to remove it from the list of active plugins.

**Command:**

```bash
oshea plugin disable restaurant-menu
```

**Explanation:**

  * `plugin disable`: The command to deactivate a plugin by its invoke name.

The plugin is no longer active, but its files still exist in your managed plugin root.

---

### Step 5: Remove the Plugin

Finally, remove the installed plugin from your system.

**Command:**

```bash
oshea plugin remove restaurant-menu
```

**Explanation:**

  * `plugin remove`: Deletes an installed user plugin.

This completes the full lifecycle. You installed a plugin, used it, and cleaned up your environment.
