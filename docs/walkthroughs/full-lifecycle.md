# Walkthrough: A Plugin's Full Lifecycle

This guide demonstrates a complete, real-world workflow for managing plugins in **oshea**. You will add a plugin collection from a remote Git repository, enable a specific plugin, use it to convert a document, and then clean up by disabling the plugin and removing the collection.

This entire process is automated and verified by the test at
[`test/runners/end-to-end/workflows/workflow-tests.yaml`](../../test/runners/end-to-end/workflows/workflow-tests.yaml),
which you can run to confirm that the steps above work as expected.

**Command.**
```bash
node test/runners/end-to-end/workflows/workflow-test-runner.js --show
```
This will run the whole process, showing output as it happens, leaving your user-data untouched.

### Prerequisites

  * `oshea` installed.
  * `git` installed on your system.
  * A sample Markdown file. You can create one named `sample.md` with the content: `# My Document`.

---

### Step 1: Add a Plugin Collection

First, add a collection of plugins from a remote Git repository. This command clones the repository into your managed collections directory, making its plugins available to be enabled.

**Command:**

```bash
oshea collection add https://github.com/brege/oshea-plugins.git --name lifecycle-collection
```

**Explanation:**

  * `collection add`: The command to add a new source of plugins.
  * `https://github.com/brege/oshea-plugins.git`: The URL of the remote Git repository containing the plugins.
  * `--name lifecycle-collection`: Assigns a local, memorable name to this collection.

---

### Step 2: Enable a Plugin

Now that the collection is available, you can enable a specific plugin from it. We'll enable the `restaurant-menu` plugin.

**Command:**

```bash
oshea plugin enable lifecycle-collection/restaurant-menu
```

**Explanation:**

  * `plugin enable`: The command to activate a plugin.
  * `lifecycle-collection/restaurant-menu`: The unique identifier for the plugin, in the format `<collection_name>/<plugin_id>`.

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

The plugin is no longer active, but its source files still exist within the collection on your machine.

---

### Step 5: Remove the Collection

Finally, to completely remove the plugin and all others from the `lifecycle-collection`, you can remove the entire collection.

**Command:**

```bash
oshea collection remove lifecycle-collection
```

**Explanation:**

  * `collection remove`: The command to delete a collection and all its contents from your system.

This completes the full lifecycle. You have successfully added a source of plugins, used one, and cleaned up your environment.
