#!/usr/bin/env node
// scripts/demo/test-js-formatter.js
// Test cases for JavaScript syntax highlighting formatter

require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

console.log('=== Testing JavaScript Formatter ===\n');

console.log('1. Testing keyword highlighting:');
const keywordExample = `const myVar = 42;
let result = function() {
  return class MyClass {
    constructor() {
      if (true) {
        for (let i = 0; i < 10; i++) {
          while (condition) {
            export default something;
          }
        }
      }
    }
  }
};`;
logger.info(keywordExample, { format: 'js' });

console.log('\n2. Testing string highlighting:');
const stringExample = `const message = "Hello world";
const template = 'Template string with "nested quotes"';
const multiline = \`This is a
multiline template
with \${variables}\`;`;
logger.info(stringExample, { format: 'js' });

console.log('\n3. Testing property and object highlighting:');
const propertyExample = `const config = {
  name: "my-app",
  version: "1.0.0",
  scripts: {
    start: "node index.js",
    test: "npm test"
  },
  dependencies: ["lodash", "express"]
};`;
logger.info(propertyExample, { format: 'js' });

console.log('\n4. Testing number highlighting:');
const numberExample = `const integers = [1, 42, 100, 999];
const floats = [3.14, 0.5, 99.99];
const calculations = 42 * 3.14 + 100;`;
logger.info(numberExample, { format: 'js' });

console.log('\n5. Testing comment highlighting:');
const commentExample = `// Single line comment
const value = 42; // Inline comment

/* Multi-line comment
   spanning multiple lines
   with details */
function test() {
  return "hello"; // Another comment
}`;
logger.info(commentExample, { format: 'js' });

console.log('\n6. Testing import/require statement highlighting:');
const importExample = `require('module-alias/register');
const { loggerPath, configPath } = require('@paths');
const express = require('express');

import React from 'react';
import { useState, useEffect } from 'react';
import MyComponent from './components/MyComponent';`;
logger.info(importExample, { format: 'js' });

console.log('\n7. Testing file path highlighting:');
const pathExample = `// File: /home/user/project/src/utils/logger.js
// Import: /home/user/project/src/formatters/js.formatter.js
const myFile = '/var/log/app.log';
require('/absolute/path/to/module.js');`;
logger.info(pathExample, { format: 'js' });

console.log('\n8. Testing complex real-world code:');
const complexExample = `function createLogger(context) {
  return {
    info: (msg, options = {}) => logger(msg, { ...options, level: 'info', context }),
    error: (msg, options = {}) => {
      // Categorize error based on message content
      const category = categorizeError(msg);
      return logger(msg, { ...options, level: 'error', context, category });
    }
  };
}

module.exports = { createLogger };`;
logger.info(complexExample, { format: 'js' });

console.log('\n9. Testing error-level output with JS formatter:');
const errorCode = `try {
  dangerousOperation();
} catch (error) {
  logger.error('Operation failed: ' + error.message);
}`;
logger.error(errorCode, { format: 'js' });

console.log('\n10. Testing different log levels with JS formatter:');
const testCode = 'console.log("Debug output");';
logger.debug(testCode, { format: 'js' });
logger.warn(testCode, { format: 'js' });
logger.success(testCode, { format: 'js' });

console.log('\n=== JavaScript Formatter Test Complete ===');
