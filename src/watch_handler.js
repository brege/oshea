// src/watch_handler.js
const path = require('path');
const fs = require('fs').promises;
const fss = require('fs'); // Sync for existsSync
const chokidar = require('chokidar');
const { loadConfig } = require('./markdown_utils');
const PluginManager = require('./PluginManager');

async function setupWatch(args, initialFullConfig, initialPluginManager, commandExecutor) {
    let isProcessing = false;
    let needsRebuild = false;
    // processingFilePath = null; // Kept for clarity, though not used in toned-down logging

    let currentFullConfig = initialFullConfig;
    let currentPluginManager = initialPluginManager;
    let watcher = null;

    const getPathsToIntendToWatch = async (config, pluginManagerInstance, cmdArgs) => {
        const files = new Set();
        if (cmdArgs.config && fss.existsSync(cmdArgs.config)) {
            files.add(path.resolve(cmdArgs.config));
        }

        const pluginNameForWatch = cmdArgs.plugin || cmdArgs.pluginName;
        if (pluginNameForWatch) {
            await pluginManagerInstance.loadPluginConfig(pluginNameForWatch);
            const pluginDetails = await pluginManagerInstance.getPluginDetails(pluginNameForWatch);

            if (pluginDetails && pluginDetails.config) {
                const pluginConfigPathFromMain = pluginManagerInstance.registeredPluginPaths[pluginNameForWatch];
                if (pluginConfigPathFromMain) {
                    const absolutePluginConfigPath = path.resolve(pluginManagerInstance.projectRoot, pluginConfigPathFromMain);
                    if (fss.existsSync(absolutePluginConfigPath)) {
                        files.add(absolutePluginConfigPath);
                    }
                }
                if (pluginDetails.config.css_files && Array.isArray(pluginDetails.config.css_files)) {
                    pluginDetails.config.css_files.forEach(cssFile => {
                        const absoluteCssPath = path.resolve(pluginDetails.basePath, cssFile);
                        if (fss.existsSync(absoluteCssPath)) {
                            files.add(absoluteCssPath);
                        }
                    });
                }
            }
        }

        if (cmdArgs.markdownFile && fss.existsSync(cmdArgs.markdownFile)) {
            files.add(path.resolve(cmdArgs.markdownFile));
        }

        if (cmdArgs.pluginName === 'recipe-book' && cmdArgs.recipesBaseDir) {
            const recipesBaseDir = path.resolve(cmdArgs.recipesBaseDir);
            if (fss.existsSync(recipesBaseDir)) {
                files.add(recipesBaseDir);
                try {
                    const dirents = await fs.readdir(recipesBaseDir, { withFileTypes: true });
                    for (const dirent of dirents) {
                        const fullSubPath = path.join(recipesBaseDir, dirent.name);
                        if (dirent.isDirectory()) {
                            files.add(fullSubPath);
                            const potentialIndexFile = path.join(fullSubPath, 'index.md');
                            if (fss.existsSync(potentialIndexFile)) {
                                files.add(potentialIndexFile);
                            }
                        } else if (dirent.isFile() && dirent.name.endsWith('.md')) {
                            files.add(fullSubPath);
                        }
                    }
                } catch (e) {
                    console.warn(`WARN: Could not fully list recipe-book source directory for watching: ${e.message}`);
                }
            } else {
                console.warn(`WARN: recipesBaseDir ${recipesBaseDir} does not exist. Cannot watch it.`);
            }
        }
        return Array.from(new Set(files));
    };

    let intendedWatchPaths = await getPathsToIntendToWatch(currentFullConfig, currentPluginManager, args);

    if (intendedWatchPaths.length === 0) {
        console.warn("WARN: Watch mode activated, but no files were identified to watch. Executing command once.");
        await commandExecutor(args, currentFullConfig, currentPluginManager);
        return;
    }

    console.log("\nWatch mode active. Initially monitoring:");
    intendedWatchPaths.forEach(f => console.log(`  - ${f}`));
    console.log("Press Ctrl+C to exit.");

    const rebuild = async (event, filePathTrigger) => {
        // Minimal logging for event trigger unless it's a significant one.
        // console.log(`Event: '${event}' for path: '${filePathTrigger}'. Current isProcessing: ${isProcessing}, needsRebuild: ${needsRebuild}`);
        if (isProcessing) {
            // console.log(`Queueing rebuild for ${filePathTrigger} (event: ${event}) due to ongoing processing.`);
            needsRebuild = true;
            return;
        }

        isProcessing = true;
        needsRebuild = false; 
        // processingFilePath = filePathTrigger; // Can be removed if not used in logging
        console.log(`\nDetected ${event} in: ${filePathTrigger}. Rebuilding...`);

        try {
            currentFullConfig = await loadConfig(args.config);
            currentPluginManager = new PluginManager(currentFullConfig); 

            const newIntendedWatchPaths = await getPathsToIntendToWatch(currentFullConfig, currentPluginManager, args);

            const pathsToAddDueToConfigChange = newIntendedWatchPaths.filter(p => !intendedWatchPaths.includes(p));
            const pathsToRemoveDueToConfigChange = intendedWatchPaths.filter(p => !newIntendedWatchPaths.includes(p));

            if (pathsToRemoveDueToConfigChange.length > 0) {
                console.log("Paths no longer in config or valid, unwatching:", pathsToRemoveDueToConfigChange);
                if (watcher) watcher.unwatch(pathsToRemoveDueToConfigChange);
            }
            if (pathsToAddDueToConfigChange.length > 0) {
                console.log("New paths found in config or became valid, adding to watcher:", pathsToAddDueToConfigChange);
                if (watcher) watcher.add(pathsToAddDueToConfigChange);
            }
            intendedWatchPaths = newIntendedWatchPaths;

            await commandExecutor(args, currentFullConfig, currentPluginManager);

            if (event === 'unlink' && intendedWatchPaths.includes(filePathTrigger)) {
                if (fss.existsSync(filePathTrigger)) { 
                    // console.log(`File ${filePathTrigger} was unlinked and reappeared. Explicitly re-adding to watcher.`);
                    if (watcher) watcher.add(filePathTrigger);
                } else {
                    // console.log(`File ${filePathTrigger} was unlinked and did not immediately reappear.`);
                }
            }

        } catch (error) {
            console.error(`ERROR during rebuild triggered by ${filePathTrigger} (${event}): ${error.message}`);
            if (error.stack) console.error(error.stack);
        } finally {
            // console.log(`Finished processing ${filePathTrigger}. isProcessing: false.`);
            isProcessing = false;
            // processingFilePath = null; // Can be removed
            if (needsRebuild) {
                console.log("Executing queued rebuild...");
                setTimeout(() => { 
                    if (!isProcessing) {
                         rebuild("queued", "queued changes");
                    } else {
                        // console.log("Queued rebuild skipped, another process started.");
                        needsRebuild = true; 
                    }
                }, 100);
            } else {
                console.log("Watching for further changes...");
            }
        }
    };
    
    watcher = chokidar.watch(intendedWatchPaths, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
           stabilityThreshold: 500,
           pollInterval: 100
        }
    });

    watcher
        .on('all', (event, filePath) => {
            if (event === 'add' || event === 'change' || event === 'unlink') {
                // Minimal internal log, rebuild() will log the important "Detected change..."
                // console.log(`Chokidar event: '${event}', path: '${filePath}'`);
                rebuild(event, filePath);
            } else {
                // console.log(`Chokidar event (ignored for direct rebuild): '${event}', path: '${filePath}'`);
            }
        })
        .on('error', error => console.error(`Watcher error: ${error}`));

    try {
        console.log("Performing initial build...");
        await commandExecutor(args, currentFullConfig, currentPluginManager);
    } catch (e) {
        console.error(`ERROR during initial build in watch mode: ${e.message}`);
    }
}

module.exports = { setupWatch };
