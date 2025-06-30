## Why Centralize Path Anchors?

After just making the old brittle, deeply nested relative paths work again in the new organizational structure, I’m convinced there’s huge value in centralizing all path anchors with a `paths.js` file and a `@paths` alias. Reorganizing the codebase was a slog—every move or rename meant hunting down and updating endless chains of `..` in dozens of files. If I had a single, centralized place for all my key paths, I could have made these changes painlessly, just by updating one file. Combined with unique filenames, this setup would make even large-scale reorganizations or splits scriptable and safe.

The difference in readability is night and day. With a centralized anchor, every path reference is clear and consistent, instead of a confusing maze of relative jumps. Even though I’m catching this early in the project’s life, I can already feel the fatigue of imagining doing this again a few months from now. As the project grows, or as I need to modernize dependencies or add new features, having a single source of truth for paths will make everything—from onboarding helpers to debugging quirks—much simpler and less error-prone.

**before (now), a hell awaited..**


```
src/cli/commands/collection/removeCmd.js:
  [resolve] __dirname, '../../../../cli.js'

src/cli/commands/plugin/createCmd.js:
  [resolve] __dirname, '..', '..', '..', '..', 'plugins', 'template-basic'
  [resolve] __dirname, '../../../../cli.js'

src/cli/get_help.js:
  [resolve] __dirname, '../..'
```

## After: Clean, Centralized Path Anchors with `@paths`

**Step 1:** Create `paths.js` in the project root:

```js
const path = require('path');

const projectRoot = __dirname;
const cliJs = path.join(projectRoot, 'cli.js');
const pluginsDir = path.join(projectRoot, 'plugins');
const templateBasicDir = path.join(pluginsDir, 'template-basic');

module.exports = {
  projectRoot,
  cliJs,
  pluginsDir,
  templateBasicDir,
  // more as needed
};
```

**Step 2:** Set up the alias using `module-alias`:

- Install: `npm install module-alias --save`
- In `package.json`:
  ```json
  "_moduleAliases": {
    "@paths": "paths.js"
  }
  ```
- Add to entry point: `require('module-alias/register');`

**Step 3:** Refactor code to use the alias:

```js
const { cliJs, templateBasicDir } = require('@paths');
```

**a future-me sees a better tomorrow:**

```
src/cli/commands/collection/removeCmd.js:
  [require] @paths.cliJs

src/cli/commands/plugin/createCmd.js:
  [require] @paths.templateBasicDir
  [require] @paths.cliJs

src/cli/get_help.js:
  [require] @paths.projectRoot
```

## Why

Having just gone through the pain of making brittle paths work after a reorg, I don’t want to do this again, let alone a year from now. Centralizing paths means I can refactor or move files without dread—just update `paths.js` and everything else works. As the project grows, or as standards and dependencies change, this setup will make my reintegration into the project mush smoother.


| Old Pattern                                      | New Pattern                        |
|--------------------------------------------------|------------------------------------|
| `path.resolve(__dirname, '../../../../cli.js')`  | `const { cliJs } = require('@paths')` |
| `path.resolve(__dirname, '..', '..', ... )`      | `const { templateBasicDir } = require('@paths')` |
| `path.join(projectRoot, 'plugins', pluginId)`    | `const { pluginsDir } = require('@paths'); path.join(pluginsDir, pluginId)` |

**Takeaway:** I should set up `paths.js` and path aliases now.
  
The time and frustration saved on every future refactor or reorg is more than worth the small up-front effort. Future-me will thank present-me for this decision.
