# Theming v0.11 Task List

## Overview
Integration of gruvbox color theme system to replace hardcoded chalk colors throughout the codebase. This addresses the "all-green" info logging problem and establishes consistent visual hierarchy.

## High Priority (Core Integration)
- [x] Design and implement color wheel/theme system for logger output
- [x] Update src/utils/logger.js to use gruvbox theme instead of hardcoded chalk
- [x] Update table-formatter.js to use themed colors
- [x] Find and replace all hardcoded chalk.green/red/yellow calls across codebase

## Medium Priority (Specific Components)
- [ ] Update validator output formatting to use themed colors
- [ ] Update CLI command output to use themed colors
- [ ] Test all formatters with new theme via playground

## Low Priority (Future Enhancement)
- [ ] Add theme configuration options for future theme switching

## Background Tasks
- [ ] Implement dependency mapping integration with paths/dep-tree.js
- [ ] Add volatility dimension to test metadata

## Implementation Notes

### Completed
- Created [`src/utils/formatters/color-theme.js`](../src/utils/formatters/color-theme.js) with gruvbox palette
- Built [`scripts/playground/formatter-playground.js`](../scripts/playground/formatter-playground.js) for visual testing
- Added `colorThemePath` to paths registry
- Verified theme system works correctly via playground

### Current Work
Working on main logger integration to establish foundation for all other components.

### Key Files
- [`src/utils/formatters/color-theme.js`](../src/utils/formatters/color-theme.js) - Theme definitions
- [`scripts/playground/formatter-playground.js`](../scripts/playground/formatter-playground.js) - Testing playground
- [`src/utils/logger.js`](../src/utils/logger.js) - Main logger (in progress)
- [`src/utils/formatters/table-formatter.js`](../src/utils/formatters/table-formatter.js) - Table formatting
- [`src/validators/v1.js`](../src/validators/v1.js) - Validator output

### Target Pattern
Replace:
```js
chalk.green('message')
```
With:
```js
theme.success('message')
```

### Theme Mappings
- `success` - bright green (validation pass, operations complete)
- `info` - bright blue (processing info, status updates)
- `warn` - bright yellow (warnings, missing optional items)
- `error` - bright red (errors, failures)
- `debug` - gray (debug info, verbose logging)
- `validation` - bright aqua (validation headers)
- `highlight` - bright orange (emphasis, command names)
- `path` - aqua (file paths)
- `value` - bright yellow (variable values)
- `context` - light gray (contextual information)