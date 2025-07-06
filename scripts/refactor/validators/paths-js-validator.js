// scripts/refactor/validators/paths-js-validator.js
const fs = require('fs');

// Adjust the path if needed
const paths = require('../../../paths.js');

console.log('Validating paths in paths.js');
console.log('-------------------------------------');

for (const [name, filePath] of Object.entries(paths)) {
  if (typeof filePath !== 'string') continue; // Only check strings
  if (fs.existsSync(filePath)) {
    console.log(`FOUND: ${name} -> ${filePath}`);
  } else {
    console.log(`MISSING: ${name} -> ${filePath}`);
  }
}

console.log('-------------------------------------');
console.log('Validation complete');

