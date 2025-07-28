#!/usr/bin/env node
// scripts/playground/formatter-playground.js
// lint-skip-file no-console

require('module-alias/register');

const { colorThemePath } = require('@paths');
const { theme, palette, colorize } = require(colorThemePath);
const chalk = require('chalk');

function showPalette() {
  console.log(theme.highlight('=== Gruvbox Color Palette ===\n'));

  // Show raw colors
  console.log('Raw Palette:');
  Object.entries(palette).forEach(([name, hex]) => {
    console.log(`  ${name.padEnd(15)} ${chalk.hex(hex)('██')} ${hex}`);
  });
  console.log('');
}

function showLogLevels() {
  console.log(theme.highlight('=== Log Level Examples ===\n'));

  console.log(theme.success('✓ Plugin validation passed'));
  console.log(theme.info('ℹ Processing convert command for example.md'));
  console.log(theme.warn('○ Missing optional schema file'));
  console.log(theme.error('✗ Handler script not found'));
  console.log(theme.debug(' Cache hit for plugin registry'));
  console.log(theme.validation('--- Validation Summary ---'));
  console.log(theme.detail(' Configuration details loaded'));
  console.log('');
}

function showUIElements() {
  console.log(theme.highlight('=== UI Element Examples ===\n'));

  console.log(`Processing ${theme.highlight('convert')} command for: ${colorize.path('src/docs/example.md')}`);
  console.log(`Plugin ${colorize.value('cv')} loaded from ${colorize.path('plugins/cv/')}`);
  console.log(`Found ${colorize.value('3')} enabled plugins in ${colorize.context('CollectionsManager')}`);
  console.log(`Using ${theme.accent('next-generation')} test framework`);
  console.log('');
}

function showValidatorOutput() {
  console.log(theme.highlight('=== Validator Output Sample ===\n'));

  console.log(theme.info('  Checking plugin file structure... '));
  console.log(theme.success('✓ OK'));
  console.log(theme.success('    ✓ Found required file: index.js'));
  console.log(theme.success('    ✓ Found required file: cv.config.yaml'));
  console.log(theme.warn('    ○ Missing optional file: cv.schema.json'));
  console.log('');

  console.log(theme.info('  Running in-situ E2E test... '));
  console.log(theme.success('✓ OK'));
  console.log(theme.success('    ✓ CV Plugin E2E Test'));
  console.log(theme.success('      ✓ should convert cv-example.md to PDF'));
  console.log(theme.success('      1 passing (142ms)'));
  console.log('');
}

function showTableSample() {
  console.log(theme.highlight('=== Table Formatter Sample ===\n'));

  // Mock table output
  console.log(theme.header('Plugin Registry'));
  console.log(theme.border('─'.repeat(50)));
  console.log(`${theme.header('Name'.padEnd(15))} ${theme.header('Status'.padEnd(12))} ${theme.header('Source')}`);
  console.log(theme.border('─'.repeat(50)));
  console.log(`${'cv'.padEnd(15)} ${theme.enabled('Enabled'.padEnd(12))} Bundled`);
  console.log(`${'recipe'.padEnd(15)} ${theme.enabled('Enabled'.padEnd(12))} Bundled`);
  console.log(`${'business-card'.padEnd(15)} ${theme.disabled('Available'.padEnd(12))} CM`);
  console.log(`${'invoice'.padEnd(15)} ${theme.pending('Pending'.padEnd(12))} CM`);
  console.log(theme.border('─'.repeat(50)));
  console.log('');
}

function showCommandExamples() {
  console.log(theme.highlight('=== Command Output Examples ===\n'));

  // Convert command
  console.log(theme.info('Processing convert command for: example.md'));
  console.log(`  Plugin ${colorize.value('cv')} ${theme.context('determined via CLI option')}`);
  console.log(`  Output: ${colorize.path('dist/john-doe-cv.pdf')}`);
  console.log(theme.success('✓ PDF generated successfully'));
  console.log('');

  // Plugin list
  console.log(theme.info('Available plugins:'));
  console.log(`  ${theme.enabled('●')} cv ${theme.context('(Bundled)')}`);
  console.log(`  ${theme.enabled('●')} recipe ${theme.context('(Bundled)')}`);
  console.log(`  ${theme.disabled('○')} business-card ${theme.context('(CM: Available)')}`);
  console.log('');
}

// Main playground
function main() {
  console.clear();
  console.log(theme.highlight('MD-to-PDF Formatter Playground \n'));

  showPalette();
  showLogLevels();
  showUIElements();
  showValidatorOutput();
  showTableSample();
  showCommandExamples();

  console.log(theme.highlight('=== End Playground ===\n'));
  console.log(theme.debug('Use this to test color combinations and formatting before implementing in the app.'));
}

if (require.main === module) {
  main();
}
