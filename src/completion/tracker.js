// src/completion/tracker.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const CACHE_FRESHNESS_THRESHOLD = 5000;

function getCachePath() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(xdgCacheHome, 'md-to-pdf', 'dynamic-completion-data.json');
}

function triggerCacheUpdate() {
  const { completionRoot } = require('@paths');
  const scriptPath = path.join(completionRoot, 'generate-completion-dynamic-cache.js');
  if (!fs.existsSync(scriptPath)) {
    return;
  }

  try {
    const child = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } catch {
    // Suppress errors
  }
}

function getDynamicData() {
  const cachePath = getCachePath();
  let cacheData = {};

  if (fs.existsSync(cachePath)) {
    try {
      cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const lastUpdated = new Date(cacheData.lastUpdated || 0);
      const now = new Date();

      if (now - lastUpdated > CACHE_FRESHNESS_THRESHOLD) {
        triggerCacheUpdate();
      }
    } catch {
      triggerCacheUpdate();
      return {};
    }
  } else {
    triggerCacheUpdate();
    return {};
  }

  return cacheData;
}

// --- Exported Provider Functions ---

function getUsablePlugins() {
  const data = getDynamicData();
  return data.usablePlugins || [];
}

function getDownloadedCollections() {
  const data = getDynamicData();
  return data.downloadedCollections || [];
}

function getEnabledPlugins() {
  const data = getDynamicData();
  return data.enabledPlugins || [];
}

function getAvailablePlugins() {
  const data = getDynamicData();
  return data.availablePlugins || [];
}

function getUserPlugins() {
  const data = getDynamicData();
  return data.userPlugins || [];
}

module.exports = {
  getUsablePlugins,
  getDownloadedCollections,
  getEnabledPlugins,
  getAvailablePlugins,
  getUserPlugins
};
