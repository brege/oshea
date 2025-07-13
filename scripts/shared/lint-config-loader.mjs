// scripts/shared/lint-config-loader.js
import fs from 'fs';
import yaml from 'js-yaml';

export function loadLintSection(section, configPath = 'scripts/linting/config.yaml') {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);
  if (!config[section]) {
    throw new Error(`Section '${section}' not found in ${configPath}`);
  }
  return config[section];
}

