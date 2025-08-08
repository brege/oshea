#!/usr/bin/env node
// scripts/demo/test-dynamic-injection.js
// Comprehensive test cases for logger dynamic injection features

require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

console.log('=== Testing Logger Dynamic Injection Features ===\n');

// Test 1: Enable all dynamic injection features
logger.configureLogger({
  showCaller: true,
  showStack: true,
  enrichErrors: true,
  stackDepth: 3
});

console.log('1. Testing logger.for() convenience method:');
const dbLogger = logger.for('Database');
const authLogger = logger.for('Authentication');

dbLogger.info('Database connection established');
authLogger.warn('Rate limiting applied to user session');

console.log('\n2. Testing caller detection across different call patterns:');

function simpleFunction() {
  logger.info('Called from simpleFunction()');
}

const objectMethod = {
  testMethod() {
    logger.warn('Called from object method');
  }
};

const arrowFunction = () => {
  logger.detail('Called from arrow function');
};

simpleFunction();
objectMethod.testMethod();
arrowFunction();

console.log('\n3. Testing error categorization and contextual hints:');

// Filesystem errors
logger.error('Could not read configuration file: config.yaml not found');
logger.error('Failed to write output file: Permission denied');
logger.error('Directory /var/log/app does not exist: ENOENT');

// Plugin errors
logger.error('Plugin validation failed: missing required field "name"');
logger.error('Cannot load bundled plugin cv: contract violation');
logger.error('Plugin registry lookup failed for unknown-plugin');

// Config errors
logger.error('Invalid YAML syntax in user configuration');
logger.error('Missing required configuration field: output_directory');
logger.error('JSON parse error in manifest file');

// Network errors
logger.error('Failed to fetch from git repository: connection timeout');
logger.error('DNS resolution failed for github.com');
logger.error('SSL certificate verification failed');

// Validation errors
logger.error('Schema validation failed: invalid field type');
logger.error('Required field missing: plugin.name');
logger.error('Validation error: expected string, got number');

// CLI errors
logger.error('Unknown command: invalidcommand');
logger.error('Missing required argument: filename');
logger.error('Invalid flag: --unknown-option');

// Fatal errors
logger.fatal('FATAL: Critical system error - out of memory');

console.log('\n4. Testing contextual hints based on caller location:');

function simulatePluginError() {
  logger.error('Plugin contract validation failed');
}

function simulateConfigError() {
  logger.error('Configuration parsing failed: invalid YAML');
}

simulatePluginError();
simulateConfigError();

console.log('\n5. Testing stack trace injection:');
logger.configureLogger({ showStack: true });

function level3() {
  logger.error('Error in deeply nested function');
}

function level2() {
  level3();
}

function level1() {
  level2();
}

level1();

console.log('\n6. Testing with different stack depths:');
logger.configureLogger({ stackDepth: 1 });
logger.error('Error with stack depth 1');

logger.configureLogger({ stackDepth: 5 });
logger.error('Error with stack depth 5');

console.log('\n7. Testing enhancement disable/enable:');
logger.configureLogger({
  showCaller: false,
  showStack: false,
  enrichErrors: false
});
logger.error('Plain error without enhancements');

logger.configureLogger({
  showCaller: true,
  enrichErrors: true
});
logger.error('Error with selective enhancements enabled');

console.log('\n=== Dynamic Injection Test Complete ===');