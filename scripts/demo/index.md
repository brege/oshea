## Demonstration Scripts

Visual validation and demonstration scripts for testing and showcasing project functionality. These provide console output for manual inspection and serve as reference examples for plugin developers.

### Logger System Demonstrations

- [`test-dynamic-injection.js`](test-dynamic-injection.js) -- Comprehensive testing of logger dynamic injection features (caller detection, error categorization, contextual hints, stack traces)
- [`test-js-formatter.js`](test-js-formatter.js) -- JavaScript syntax highlighting formatter demonstration with various code patterns and log levels

### Path System Demonstrations  

- [`test-path-enhancements.js`](test-path-enhancements.js) -- Path registry functionality testing (forward/reverse lookups, completeness validation, circular verification)

### Formatter System Demonstrations

- [`formatter-playground.js`](formatter-playground.js) -- Interactive testing ground for console formatters and output styling
- [`toy-validation-formatter.js`](toy-validation-formatter.js) -- Validation formatter testing and visual inspection tool

### Usage

These scripts are designed for manual execution and visual inspection:

```bash
node scripts/demo/test-dynamic-injection.js    # Test logger enhancements
node scripts/demo/test-js-formatter.js         # Test syntax highlighting  
node scripts/demo/test-path-enhancements.js    # Test path system features
node scripts/demo/formatter-playground.js      # Test to-console formatters
node scripts/demo/toy-validation-formatter.js  # Simulate `plugin validate`
```

Each script produces colored console output demonstrating specific functionality, making them useful for both development validation and as reference examples for plugin authors who want to leverage these systems.
