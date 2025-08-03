# Walkthrough: Updating and Syncing Plugins

This guide covers how to keep your plugins up-to-date, whether they are from a remote collection or part of your own local development workflow.

## Part 1: Updating Remote Collections

This is the most common scenario. When you've added a plugin collection from a Git repository, you can pull in the latest changes from the original author with a single command.

### Step 1: Check for Updates

You can update all your Git-based collections at once. This will fetch the latest commits from their remote repositories.

**Command:**

```bash
oshea collection update
```

If you only want to update a specific collection, you can provide its name:

```bash
oshea collection update lifecycle-collection
```

**Explanation:**

  * The `update` command iterates through your managed collections.
  * For each collection that was added from a Git source, it performs a `git pull` (specifically, a `git fetch` and `git reset --hard`) to match the latest version of the default branch.
  * It will not overwrite any collections that have local, uncommitted changes, ensuring your own modifications are safe.

-----

## Part 2: The Local Development Workflow

This is a more advanced workflow that demonstrates how to create, use, and update a plugin you are actively developing on your local machine. The `CollectionsManager` can track your local source directory and re-sync it on command.

### Step 1: Create a New "Flyer" Plugin

We'll start by creating a new plugin from the default template.

**Command:**

```bash
oshea plugin create my-flyer
```

This creates a new directory, `./my-flyer/`, with all the boilerplate files for a new plugin. This is our local "development" version.

### Step 2: Initial Customization

Let's turn the boilerplate into a simple party invitation.

First, replace the content of **`my-flyer/my-flyer-example.md`** with the following invitation text:

**File: `my-flyer/my-flyer-example.md`**

```markdown
---
title: "You're Invited!"
event_name: "Summer Garden Party"
event_date: "Saturday, August 16th"
event_time: "4:00 PM"
event_location: "The Oak Grove Pavilion"
oshea_plugin: "./my-flyer.config.yaml"
---

# {{ event_name }}

## Join Us For a Celebration

### {{ event_date }} at {{ event_time }}
### {{ event_location }}

Come enjoy good food, great company, and live music under the stars.

*RSVP by August 1st*
```

Next, replace the content of **`my-flyer/my-flyer.css`** with some initial styles:

**File: `my-flyer/my-flyer.css`**

```css
/* Version 1: Blue & Gray Theme */
body {
    font-family: 'Georgia', serif;
    text-align: center;
    color: #333;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
}
h1 {
    font-size: 3em;
    color: #2a7a9d;
    border-bottom: 2px solid #2a7a9d;
    padding-bottom: 0.2em;
    margin-bottom: 0.2em;
}
h2 {
    font-size: 1.5em;
    color: #444;
    font-style: italic;
    font-weight: normal;
    margin-top: 0;
}
h3 {
    font-size: 1.2em;
    color: #555;
    margin: 0.2em;
}
p {
    font-size: 1.1em;
    margin-top: 1.5em;
}
p:last-of-type {
    margin-top: 2em;
    font-style: italic;
    color: #777;
}
```

### Step 3: Add Your Local Plugin to be Managed

Now, tell `oshea` about your local plugin. This command copies your plugin into the managed collections directory and enables it.

**Command:**

```bash
oshea plugin add ./my-flyer
```

**Explanation:**

  * The `plugin add` command creates a managed copy of your local plugin in the special `_user_added_plugins` collection.
  * It records the original source path (`./my-flyer`) in its metadata.

### Step 4: Make Further Edits to Your Local Plugin

Let's change the theme of our flyer. Open your **original** source file, **`./my-flyer/my-flyer.css`**, and replace its contents with this new "sunset" theme.

**File: `my-flyer/my-flyer.css` (Updated)**

```css
/* Version 2: Sunset Theme */
body {
    font-family: 'Palatino', 'Book Antiqua', serif;
    text-align: center;
    color: #4C2F1B; /* Dark Brown */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    background-color: #FFF9F0; /* Cream background */
}
h1 {
    font-size: 3em;
    color: #D9534F; /* Terracotta Red */
    border-bottom: 2px solid #D9534F;
    padding-bottom: 0.2em;
    margin-bottom: 0.2em;
}
h2 {
    font-size: 1.5em;
    color: #5A9A78; /* Muted Green */
    font-style: italic;
    font-weight: normal;
    margin-top: 0;
}
h3 {
    font-size: 1.2em;
    color: #4C2F1B;
    margin: 0.2em;
}
p {
    font-size: 1.1em;
    margin-top: 1.5em;
}
p:last-of-type {
    margin-top: 2em;
    font-style: italic;
    color: #777;
}
```

At this point, if you were to convert a document, it would still use the *old* (blue) theme because the managed copy is not yet updated.

### Step 5: Sync Your Local Changes

To update the managed version of your plugin with the changes you just made, run the `update` command on the special `_user_added_plugins` collection.

**Command:**

```bash
oshea collection update _user_added_plugins
```

**Explanation:**

  * The `collection update` command detects that plugins in `_user_added_plugins` are sourced from local paths.
  * Instead of a `git pull`, it re-copies the contents from the original source directory (`./my-flyer`), overwriting the managed version with your latest changes.

### Step 6: Verify the Update

Now, run the conversion again:

```bash
oshea convert my-flyer/my-flyer-example.md --outdir ./output
```

Open the newly generated PDF. You will see it now has the "sunset" theme (cream background, red heading), confirming that your local changes were successfully synced and applied. This workflow allows you to develop plugins in any directory you choose while still leveraging the power of `oshea`'s management system.
