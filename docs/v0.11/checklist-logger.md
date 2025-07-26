### Logger-Centric Checklist

This checklist includes tasks directly related to the implementation, testing, and documentation of the logger system itself.

#### To-Do

- **Enhanced Logger with Dynamic Injection**
  - [ ] Integrate caller detection from prototype
  - [ ] Add error pattern recognition (filesystem, plugin, config categories)
  - [ ] Add stack trace injection on demand
  - [ ] Add structured context display formatting
- **Fix Linter Output Streams**
  - [ ] Ensure consistent formatting across all validation output
  - [ ] Test that output formatting remains correct
- **Test Enhanced Logger**
  - [ ] Create test cases for each injection feature
  - [ ] Verify caller detection works across different call patterns
  - [ ] Test error categorization accuracy
  - [ ] Confirm performance impact is acceptable
- **Documentation Updates**
  - [ ] Document the enhanced logger configuration options
  - [ ] Add examples of proper logger usage patterns

#### Completed

- **Core Architecture**
  - [x] Implemented pure routing layer pattern in [`src/utils/logger.js`](../../src/utils/logger.js)
  - [x] Created specialized formatter system in `src/utils/formatters/`
  - [x] Added context suppression for clean user interfaces
  - [x] Established canonical usage patterns (template literals + metadata)
  - [x] Eliminated 29→0 hardcoded logger prefixes (square brackets removed)
  - [x] Replaced bracket patterns with structured context
- **User Interface Cleanup**
  - [x] Fixed table formatter regression in plugin/collection list commands
  - [x] Eliminated debug context noise from user-facing CLI output
  - [x] Restored proper template literal patterns (values in message, not metadata)
  - [x] Removed manual stdout.write() hacks from validators
- **Layer-Specific Logging**
  - [x] **src/cli/**: Preserved user interface strings, converted operational noise to debug
  - [x] **src/core,collections,plugins/**: Converted internal operations to debug, preserved user transparency
- **ErrorManager Infrastructure Preparation**
  - [x] Maintained structured debug logging as operational checkpoints
  - [x] Preserved rich context metadata for future error correlation
  - [x] Established patterns for debug instrumentation without UI pollution
- **Documentation**
  - [x] Created canonical reference: [`src/utils/index.md`](../../src/utils/index.md)
  - [x] Consolidated 1,645 lines across 10 files into single authoritative spec
- **Test the Litter List Rules**
  - [x] Verify that logger anti-patterns are caught

