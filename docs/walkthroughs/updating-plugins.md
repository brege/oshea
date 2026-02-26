# Walkthrough: Refreshing Installed Plugins

This guide covers the installer-only workflow for updating plugins.

## Part 1: Refresh a Plugin Installed from Git

`oshea` installs one plugin per source repository. To pull in upstream changes, reinstall the plugin.

```bash
oshea plugin remove my-plugin
oshea plugin add https://github.com/user/my-plugin
```

This replaces the managed copy with the current state from the source repo.

## Part 2: Refresh a Plugin Installed from Local Path

Use this flow when your development source directory changed and you want the managed copy updated.

### Step 1: Create a New Plugin

```bash
oshea plugin create my-flyer
```

This creates `./my-flyer/` with boilerplate files.

### Step 2: Install and Use It

```bash
oshea plugin add ./my-flyer
oshea convert my-flyer/my-flyer-example.md --plugin my-flyer --outdir ./output
```

### Step 3: Edit Plugin Source

Update files in `./my-flyer/` (`my-flyer.css`, `index.js`, or config).

### Step 4: Reinstall to Refresh Managed Copy

```bash
oshea plugin remove my-flyer
oshea plugin add ./my-flyer
```

### Step 5: Verify

```bash
oshea convert my-flyer/my-flyer-example.md --plugin my-flyer --outdir ./output
```

Open the new PDF and confirm the latest plugin changes are applied.
