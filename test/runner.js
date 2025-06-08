// test/runner.js
const { spawn } = require('child_process');
const path = require('path');
const config = require('../.mocharc.js');

// Get command-line arguments, excluding 'node' and the script path.
const args = process.argv.slice(2);

// Find the first argument that matches a suite name, or default to 'all'.
let suiteName = args.find(arg => config.testSuites[arg]) || 'all';

// --- FIX START ---
// Ensure the specPath is always an array of glob patterns.
const specGlobs = Array.isArray(config.testSuites[suiteName])
  ? config.testSuites[suiteName]
  : [config.testSuites[suiteName]];
// --- FIX END ---

// Filter out the suite name from args to pass the rest to Mocha (e.g., --grep).
const mochaArgs = args.filter(arg => arg !== suiteName);

// Construct the command to run Mocha.
const mochaCommand = 'mocha';
const finalArgs = [
    ...specGlobs, // Now this correctly spreads an array of strings
    ...mochaArgs // Any other flags like --grep
];

console.log(`Running test suite: '${suiteName}'`);
console.log(`Executing: ${mochaCommand} ${finalArgs.join(' ')}\n`);

// Spawn the Mocha process.
const mochaProcess = spawn(mochaCommand, finalArgs, {
    stdio: 'inherit', // Show Mocha's output in real-time
    shell: true // Use shell for better glob expansion
});

mochaProcess.on('close', (code) => {
    process.exit(code);
});

mochaProcess.on('error', (err) => {
    console.error('Failed to start Mocha:', err);
    process.exit(1);
});
