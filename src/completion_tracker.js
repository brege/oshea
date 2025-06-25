// src/completion_tracker.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const CACHE_FRESHNESS_THRESHOLD = 5000; // 5 seconds in milliseconds

/**
 * Determines the path for the dynamic completion cache file.
 * @returns {string} The full path to the cache file.
 */
function getCachePath() {
    const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    return path.join(xdgCacheHome, 'md-to-pdf', 'dynamic-completion-data.json');
}

/**
 * Triggers the background script to regenerate the dynamic completion cache.
 */
function triggerCacheUpdate() {
    const scriptPath = path.resolve(__dirname, '..', 'scripts', 'generate-completion-dynamic-cache.js');
    if (!fs.existsSync(scriptPath)) {
        return; // Silently fail if the script doesn't exist
    }

    try {
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'ignore'
        });
        // Allow the parent process (the completion shim) to exit independently
        child.unref();
    } catch (e) {
        // Suppress errors from spawning the background process
    }
}

/**
 * Reads the dynamic completion data cache. If the cache is stale or missing,
 * it triggers a background update.
 * @returns {object} The parsed dynamic data from the cache, or an empty object.
 */
function getDynamicData() {
    const cachePath = getCachePath();
    let cacheData = {};

    if (fs.existsSync(cachePath)) {
        try {
            cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            const lastUpdated = new Date(cacheData.lastUpdated || 0);
            const now = new Date();
            
            // If cache is stale, trigger an update but still return the old data for now.
            if (now - lastUpdated > CACHE_FRESHNESS_THRESHOLD) {
                triggerCacheUpdate();
            }
        } catch (e) {
            triggerCacheUpdate(); // Trigger update if cache is corrupt
            return {};
        }
    } else {
        triggerCacheUpdate(); // Trigger update if cache is missing
        return {};
    }
    
    return cacheData;
}

// --- Exported Provider Functions ---

/**
 * Provides a list of usable plugin names from the dynamic cache.
 * This function is now SYNCHRONOUS.
 * @returns {Array<string>} An array of usable plugin names.
 */
function getUsablePlugins() {
    const data = getDynamicData();
    return data.usablePlugins || [];
}

/**
 * Provides a list of downloaded collection names from the dynamic cache.
 * This function is now SYNCHRONOUS.
 * @returns {Array<string>} An array of downloaded collection names.
 */
function getDownloadedCollections() {
    const data = getDynamicData();
    return data.downloadedCollections || [];
}

/**
 * Provides a list of enabled plugin names from the dynamic cache.
 * This function is now SYNCHRONOUS.
 * @returns {Array<string>} An array of enabled plugin names.
 */
function getEnabledPlugins() {
    const data = getDynamicData();
    return data.enabledPlugins || [];
}

/**
 * Provides a list of available (from CM) plugin names from the dynamic cache.
 * This function is now SYNCHRONOUS.
 * @returns {Array<string>} An array of available plugin names.
 */
function getAvailablePlugins() {
    const data = getDynamicData();
    return data.availablePlugins || [];
}

module.exports = {
    getUsablePlugins,
    getDownloadedCollections,
    getEnabledPlugins,
    getAvailablePlugins
};
