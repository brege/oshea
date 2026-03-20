const { join } = require('node:path');

// Keep the browser cache inside the installed package tree so repo and
// folder-linked installs do not depend on ~/.cache/puppeteer.
module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', '.puppeteer_cache'),
  chrome: {
    skipDownload: false,
  },
  'chrome-headless-shell': {
    skipDownload: true,
  },
};
