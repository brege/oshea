// scripts/shared/lint-config-loader.js
const fs = require('fs');
const yaml = require('js-yaml');
const { lintingConfigPath } = require('@paths');

function loadLintSection(section, configPath = lintingConfigPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);
  if (!config[section]) {
    throw new Error(`Section '${section}' not found in ${configPath}`);
  }
  return config[section];
}

module.exports = {
  loadLintSection
};

