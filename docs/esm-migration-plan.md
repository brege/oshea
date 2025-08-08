# ESM Migration Plan
<!-- lint-skip-file postman -->
<!-- lint-skip-file librarian -->
## Overview

Systematic migration of oshea from CommonJS to ESM using automated linting and bucket-based dependency isolation.

## Migration Strategy

### Bucket System

**Bucket 1: Foundation Layer (12 files)**
- `src/utils/formatters/color-theme.js` (external: chalk)
- `src/utils/formatters/raw.formatter.js` (no deps)
- `src/utils/logger-enhancer.js` (no internal deps)
- `src/utils/asset-resolver.js` (external: fs, path, os)
- Individual formatter files that only depend on color-theme:
  - `lint.formatter.js`
  - `app.formatter.js` 
  - `inline.formatter.js`
  - `paths.formatter.js`
  - `validation.formatter.js`
  - `yaml-test.formatter.js`
  - `config.formatter.js` (external: js-yaml)

**Bucket 2: Formatter Aggregation (3 files)**
- `src/utils/formatters/table.formatter.js` (deps: color-theme)
- `src/utils/formatters/plugin-list.formatter.js` (deps: color-theme, table)
- `src/utils/formatters/collection-list.formatter.js` (deps: color-theme, table)
- `src/utils/formatters/index.js` (aggregates all formatters, uses module-alias)

**Bucket 3: Core Utilities (2 files)**
- `src/utils/logger.js` (deps: formatters/index, logger-enhancer)
- `src/core/math-integration.js` (deps: logger only)

**Bucket 4: Core Processing (3 files)**
- `src/core/pdf-generator.js` (deps: logger, external: puppeteer)
- `src/core/markdown-utils.js` (deps: logger, math-integration, external: fs, js-yaml, gray-matter)
- `src/core/default-handler.js` (deps: logger, markdown-utils, pdf-generator, math-integration)

**Bucket 5: Configuration System (3 files)**
- `src/config/config-utils.js` (deps: none direct)
- `src/config/plugin-config-loader.js` (deps: logger, config-utils)
- `src/config/main-config-loader.js` (deps: logger, config-utils)
- `src/config/config-resolver.js` (deps: logger, main-config-loader, plugin-config-loader)

**Bucket 6: Business Logic (15+ files)**
- `src/validators/v1.js`
- `src/plugins/plugin-*.js` (6 files)
- `src/collections/cm-utils.js`
- `src/collections/index.js`
- `src/collections/commands/*.js` (9 files)

**Bucket 7: CLI Layer (12+ files)**
- `src/cli/*.command.js` files
- `src/completion/*.js` files

**Bucket 8: Build Tooling**
- `paths/generator.js`
- `scripts/**/*.js`
- `cli.js`

## Implementation Tools

### 1. ESM Detection Linter
**File:** `scripts/linting/modernization/esm-detector.js`

```javascript
// Detect patterns:
// - require() calls
// - module.exports assignments  
// - exports.* assignments
// - __dirname/__filename usage
// - dynamic require() patterns

// Output: JSON report of all CommonJS patterns per file
```

### 2. ESM Auto-Converter
**File:** `scripts/linting/modernization/esm-converter.js`

```javascript
// Convert patterns:
// const x = require('y') → import x from 'y'
// const {a,b} = require('y') → import {a,b} from 'y'  
// const x = require('y').z → import {z as x} from 'y'
// module.exports = x → export default x
// module.exports = {a,b} → export {a,b}
// exports.x = y → export const x = y

// Special handling:
// - @paths imports → convert to relative paths initially
// - Dynamic requires → flag for manual review
// - __dirname usage → import.meta.url conversion
```

### 3. Bucket Validator
**File:** `scripts/linting/modernization/bucket-validator.js`

```javascript
// Validate:
// - No cross-bucket imports violating dependency order
// - All external dependencies are ESM-compatible
// - No remaining CommonJS patterns in converted buckets
// - Import paths resolve correctly
```

### 4. Dependency Analyzer Enhancement
**File:** `paths/lib/dependency-tracer.js` (extend existing)

```javascript
// Add:
// - Bucket classification for each file
// - Cross-bucket dependency detection
// - ESM/CommonJS pattern detection per file
// - External dependency cataloging
```

## Process Workflow

### Phase 1: Setup
1. Create modernization linters
2. Add bucket definitions to `linting-config.yaml`
3. Run full ESM detection scan
4. Generate migration report with file counts per bucket

### Phase 2: Dependency Updates
1. Update package.json dependencies:
   - `chalk: ^4.1.2` → `chalk: ^5.0.0`
   - `strip-ansi: ^6.0.1` → `strip-ansi: ^7.0.0`
2. Remove `module-alias` from dependencies
3. Test with existing CommonJS setup

### Phase 3: Bucket Migration (Repeat for each bucket)

**Pre-bucket:**
```bash
# Validate bucket isolation
npm run lint -- --rule bucket-validator --bucket N --dry-run

# Run bucket-specific tests  
npm test -- --group bucket-N
```

**Convert:**
```bash
# Auto-convert CommonJS patterns
npm run lint -- --rule esm-converter --bucket N --fix

# Manual review flagged files
# Handle edge cases not covered by auto-converter
```

**Post-bucket:**
```bash
# Validate conversion
npm run lint -- --rule esm-detector --bucket N
npm run lint -- --rule bucket-validator --bucket N

# Test converted bucket
npm test -- --group bucket-N

# Full regression test
npm test
```

### Phase 4: Path System Migration

**Update paths generator:**
1. Modify `paths/generator.js` line 152: `const path = require('path')` → `import path from 'path'`
2. Modify exports section (line 276): `module.exports = {` → `export {`
3. Update template to generate ESM imports instead of `require()`

**Transition strategy:**
- Generator emits both CommonJS and ESM versions during migration
- `paths/index.js` (CommonJS) and `paths/index.mjs` (ESM)
- Update imports bucket-by-bucket from `@paths` to relative imports
- Remove module-alias registration

### Phase 5: Final Cutover
1. Add `"type": "module"` to package.json
2. Rename remaining .js → .mjs if needed
3. Update all remaining @paths imports to relative imports
4. Remove module-alias entirely
5. Full test suite validation

## Rollback Strategy

**Per bucket rollback:**
- Git branch per bucket conversion
- Automated rollback script that reverts CommonJS→ESM conversions
- Test validation before proceeding to next bucket

**Full rollback:**
- Revert `package.json` "type" field
- Restore `module-alias` dependency
- Revert dependency version upgrades

## Validation Checkpoints

**After each bucket:**
- All existing tests pass
- No linting errors
- Dependency tree validation
- Performance regression check

**Pre-final cutover:**
- Full test suite (300+ tests) 
- CLI functionality verified
- Plugin system functional

## Risk Assessment

**High Risk:**
- Dynamic `require()` patterns in plugin loading
- Path resolution edge cases
- External plugin compatibility

**Medium Risk:**
- Test file conversions
- Script file conversions
- Build process changes

**Low Risk:**
- Pure utility file conversions
- Formatter system conversion

## File Inventory

**Total files requiring conversion:** ~100
- `src/` files: 67
- `scripts/` files: ~20
- `test/` files: ~15
- Root files: `cli.js`, `paths/generator.js`

**External dependencies requiring updates:** 3
- chalk, strip-ansi, module-alias removal

## Timeline Estimate

- Setup phase: 1 day
- Dependency updates: 0.5 days  
- Bucket 1-3: 2 days (foundation)
- Bucket 4-6: 2 days (core logic)
- Bucket 7: 1 day (CLI)
- Bucket 8: 1 day (tooling)
- Path system migration: 1 day
- Final cutover + validation: 1 day

**Total: 8-10 days**

## Success Criteria

1. All tests pass with "type": "module"
2. CLI functionality unchanged
3. Plugin system works with ESM
4. Build and lint processes functional
5. No performance regression
6. Clean git history with logical commits per bucket
