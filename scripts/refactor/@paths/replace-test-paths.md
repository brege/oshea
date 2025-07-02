# Refactoring `test/integration` Requires to Use Path Anchors

This document outlines the process for modernizing `require()` statements in the `test/integration` directory, moving from brittle relative paths to robust, maintainable anchor variables via `@paths`.

## **Stage 1: Automated Refactor of Default Pathlike Requires**

**Goal:**  
Replace all default pathlike requires (e.g. `const X = require('../../../src/foo')`) with anchor variables from `@paths`.

**Procedure:**

1. **Ensure all relevant anchors exist in `paths.js`.**
   - Example:  
     ```js
     const pdfGeneratorPath = path.join(coreRoot, 'pdf_generator.js');
     module.exports = { ..., pdfGeneratorPath, ... };
     ```

2. **Run the automated refactor script:**
   ```bash
   node scripts/refactor/replace-default-requires.js test/integration/
   ```

   - This script:
     - Rewrites default requires to use anchor variables (e.g. `const { pdfGeneratorPath } = require('@paths'); const X = require(pdfGeneratorPath);`)
     - Handles directory imports (e.g. `require('../../../src/collections')` → `collectionsIndexPath`)
     - Skips package/builtin requires
     - Leaves unmatched requires unchanged and prints a `[NO ANCHOR]` warning

## **Stage 2: Manual Review and Handling of Remaining Requires**

**Goal:**  
Identify and decide what to do about remaining requires, especially:
- Destructured requires (e.g. `const { foo } = require('../../../src/bar');`)
- Chained requires (e.g. `foo = require('../../../src/bar').foo;`)
- Test data files (e.g. `require('./some.manifest')`)

**Procedure:**

1. **Run the taxonomy script to list all require types:**
   ```bash
   node scripts/refactor/require-taxonomy-list.js test/integration/
   ```

2. **Decide on handling:**
   - **Test data files/manifests:**  
     Leave as-is (local requires are best for test data).
   - **Destructured/chained requires for app code:**  
     Proceed to Stage 3 for batch replacement.

## **Stage 3: Batch Refactor of Destructured and Chained Requires (sed/awk Gruntwork)**

**Goal:**  
Replace destructured/chained requires for app modules with anchor-based imports, and insert the necessary anchor import after any header comments.

### **A. Insert the Anchor Import After Header Comments**

For each anchor/file group, run:

#### **cmUtilsPath**
```bash
for f in test/integration/collections/cm-utils.test.1.8.*.js; do
  awk '
    !done && /^\/\// { print; next }
    !done { print "const { cmUtilsPath } = require(\"@paths\");"; done=1 }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

#### **pdfGeneratorPath**
```bash
for f in test/integration/core/pdf-generator.test.2.3.*.js; do
  awk '
    !done && /^\/\// { print; next }
    !done { print "const { pdfGeneratorPath } = require(\"@paths\");"; done=1 }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

#### **pluginDeterminerPath**
```bash
for f in test/integration/plugins/plugin_determiner.test.js; do
  awk '
    !done && /^\/\// { print; next }
    !done { print "const { pluginDeterminerPath } = require(\"@paths\");"; done=1 }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

### **B. Replace the Brittle Require Paths with Anchor Variables**

#### **cmUtilsPath**
```bash
sed -i "s|require('../../../src/collections/cm-utils')|require(cmUtilsPath)|g" test/integration/collections/cm-utils.test.1.8.*.js
```

#### **pdfGeneratorPath**
```bash
sed -i "s|require('../../../src/core/pdf_generator')|require(pdfGeneratorPath)|g" test/integration/core/pdf-generator.test.2.3.*.js
```

#### **pluginDeterminerPath**
```bash
sed -i "s|require('../../../src/plugins/plugin_determiner')|require(pluginDeterminerPath)|g" test/integration/plugins/plugin_determiner.test.js
```

### **C. For Chained Requires (if present):**

Example:
```js
determinePluginToUse = require('../../../src/plugins/plugin_determiner').determinePluginToUse;
```
Replace with:
```js
determinePluginToUse = require(pluginDeterminerPath).determinePluginToUse;
```
**Command:**
```bash
sed -i "s|require('../../../src/plugins/plugin_determiner')|require(pluginDeterminerPath)|g" test/integration/plugins/plugin_determiner.test.js
```

## **Result**

- All app code requires in `test/integration` now use anchor variables from `@paths`.
- All test data and test-local requires remain local and readable.
- Test suite is robust, maintainable, and ready for future refactors.


