#!/usr/bin/env node
// scripts/demo/test-path-enhancements.js
// Test cases for path system enhancements

require('module-alias/register');
const { pathFinderPath } = require('@paths');
const { findVariableByPath, getPathByVariable, getAllPathVariables } = require(
  pathFinderPath,
);
const path = require('path');

console.log('=== Testing Path System Enhancements ===\n');

console.log('1. Testing findVariableByPath (forward lookup):');
const testPaths = [
  'src/utils/logger.js',
  'src/core/pdf-generator.js',
  'scripts/shared/path-finder.js',
  'nonexistent/file.js',
];

testPaths.forEach((testPath) => {
  const variables = findVariableByPath(testPath);
  if (variables.length > 0) {
    console.log(`✓ ${testPath} → ${variables[0]}`);
  } else {
    console.log(`✗ ${testPath} → (no variable found)`);
  }
});

console.log('\n2. Testing getPathByVariable (reverse lookup):');
const testVariables = [
  'loggerPath',
  'pdfGeneratorPath',
  'pathFinderPath',
  'nonexistentVariable',
];

testVariables.forEach((variable) => {
  const results = getPathByVariable(variable);
  if (results.length > 0) {
    results.forEach((result) => {
      console.log(`✓ ${variable} → ${result.path}`);
    });
  } else {
    console.log(`✗ ${variable} → (no path found)`);
  }
});

console.log('\n3. Testing getAllPathVariables (first 10):');
const allVars = getAllPathVariables();
console.log(`Found ${allVars.length} total path variables`);
console.log('First 10 variables:');
allVars.slice(0, 10).forEach((item) => {
  console.log(
    `  ${item.variable} → ${path.relative(process.cwd(), item.path)}`,
  );
});

console.log('\n4. Testing path registry completeness:');
const criticalPaths = [
  'loggerPath',
  'configResolverPath',
  'pluginManagerPath',
  'defaultHandlerPath',
];

criticalPaths.forEach((varName) => {
  const results = getPathByVariable(varName);
  if (results.length > 0) {
    console.log(`✓ ${varName} exists in registry`);
  } else {
    console.log(`✗ ${varName} missing from registry`);
  }
});

console.log('\n5. Testing circular lookups (path → variable → path):');
const testCircularPaths = [
  'src/utils/logger.js',
  'src/core/default-handler.js',
];

testCircularPaths.forEach((originalPath) => {
  const variables = findVariableByPath(originalPath);
  if (variables.length > 0) {
    const variable = variables[0];
    const backToPath = getPathByVariable(variable);
    if (
      backToPath.length > 0 &&
      path.resolve(backToPath[0].path) === path.resolve(originalPath)
    ) {
      console.log(
        `✓ ${originalPath} ↔ ${variable} (circular lookup successful)`,
      );
    } else {
      console.log(`✗ ${originalPath} ↔ ${variable} (circular lookup failed)`);
    }
  } else {
    console.log(`✗ ${originalPath} → (no variable for circular test)`);
  }
});

console.log('\n6. Testing variable uniqueness:');
const variableCount = {};
allVars.forEach((item) => {
  variableCount[item.variable] = (variableCount[item.variable] || 0) + 1;
});

const duplicates = Object.entries(variableCount).filter(
  ([, count]) => count > 1,
);
if (duplicates.length > 0) {
  console.log('⚠️  Duplicate variables found:');
  duplicates.forEach(([variable, count]) => {
    console.log(`  ${variable}: ${count} occurrences`);
  });
} else {
  console.log('✓ All path variables are unique');
}

console.log('\n7. Testing path resolution accuracy:');
const sampleVars = ['loggerPath', 'configResolverPath', 'pluginManagerPath'];
sampleVars.forEach((variable) => {
  const results = getPathByVariable(variable);
  if (results.length > 0) {
    const resolvedPath = path.resolve(results[0].path);
    const fs = require('fs');
    if (fs.existsSync(resolvedPath)) {
      console.log(
        `✓ ${variable} → file exists at ${path.relative(process.cwd(), resolvedPath)}`,
      );
    } else {
      console.log(
        `✗ ${variable} → file missing at ${path.relative(process.cwd(), resolvedPath)}`,
      );
    }
  }
});

console.log('\n=== Path System Enhancement Test Complete ===');
