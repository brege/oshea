// src/utils/formatters/color-theme.js
const chalkImport = require('chalk');
const chalk = chalkImport.default || chalkImport;
if (typeof chalkImport.level === 'number') {
  chalk.level = chalkImport.level;
}

// Gruvbox color palette
// https://github.com/morhetz/gruvbox
const gruvbox = {
  // Dark background variants
  bg0_hard: '#1d2021',
  bg0: '#282828',
  bg1: '#3c3836',
  bg2: '#504945',
  bg3: '#665c54',
  bg4: '#7c6f64',
  // Light foreground variants
  fg0: '#fbf1c7',
  fg1: '#ebdbb2',
  fg2: '#d5c4a1',
  fg3: '#bdae93',
  fg4: '#a89984',
  // Colors
  red: '#cc241d',
  green: '#98971a',
  yellow: '#d79921',
  blue: '#458588',
  purple: '#b16286',
  aqua: '#689d6a',
  orange: '#d65d0e',
  // Bright variants
  bright_red: '#fb4934',
  bright_green: '#b8bb26',
  bright_yellow: '#fabd2f',
  bright_blue: '#83a598',
  bright_purple: '#d3869b',
  bright_aqua: '#8ec07c',
  bright_orange: '#fe8019',
  // Neutral grays
  gray: '#928374',
  light_gray: '#a89984',
};

// Semantic color mappings for logging
const theme = {
  // Log levels - toned down info color
  success: chalk.hex(gruvbox.bright_green),
  info: chalk.hex(gruvbox.fg0),
  warn: chalk.hex(gruvbox.bright_yellow),
  error: chalk.hex(gruvbox.bright_red),
  debug: chalk.hex(gruvbox.gray),

  // Special log types
  validation: chalk.hex(gruvbox.bright_aqua),
  detail: chalk.hex(gruvbox.purple),

  // UI elements
  highlight: chalk.hex(gruvbox.bright_orange), // For emphasis
  path: chalk.hex(gruvbox.aqua), // File paths
  value: chalk.hex(gruvbox.bright_yellow), // Variable values
  context: chalk.hex(gruvbox.light_gray), // Context info
  accent: chalk.hex(gruvbox.bright_purple), // Special highlights

  // Table formatting
  header: chalk.hex(gruvbox.fg4).bold,
  border: chalk.hex(gruvbox.bg4),

  // Status indicators
  enabled: chalk.hex(gruvbox.bright_green).bold,
  registered: chalk.hex(gruvbox.bright_aqua),
  disabled: chalk.hex(gruvbox.gray),
  pending: chalk.hex(gruvbox.bright_yellow),
  failed: chalk.hex(gruvbox.bright_red),
};

// Raw palette export for playground/testing
const palette = gruvbox;

module.exports = {
  theme,
  palette,
  // Convenience methods
  colorize: {
    path: (str) => theme.path(str),
    value: (str) => theme.value(str),
    highlight: (str) => theme.highlight(str),
    context: (str) => theme.context(str),
  },
};
