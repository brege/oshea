// src/watch_handler.js
const path = require('path');
const fsp = require('fs').promises;
const fs = require('fs'); 
const chokidar = require('chokidar');
const ConfigResolver = require('./ConfigResolver');

async function setupWatch(args, configResolverForInitialPaths, commandExecutor) { // **** MODIFIED SIGNATURE ****
    let isProcessing = false;
    let needsRebuild = false;
    let watcher = null;
    let watchedPaths = []; 

    const collectWatchablePaths = async (currentConfigResolver, currentArgs) => { // **** MODIFIED SIGNATURE ****
        const files = new Set();
        // Use the passed configResolver
        const configResolver = currentConfigResolver; 

        try {
            const effectiveConfig = await configResolver.getEffectiveConfig(currentArgs.plugin || currentArgs.pluginName);

            if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
                files.add(path.resolve(currentArgs.markdownFile));
            }

            if ((currentArgs.plugin || currentArgs.pluginName) === 'recipe-book' && currentArgs.recipesBaseDir) {
                const recipesBaseDir = path.resolve(currentArgs.recipesBaseDir);
                if (fs.existsSync(recipesBaseDir)) {
                    files.add(recipesBaseDir); 
                    try {
                        const dirents = await fsp.readdir(recipesBaseDir, { withFileTypes: true });
                        for (const dirent of dirents) {
                            const fullSubPath = path.join(recipesBaseDir, dirent.name);
                            if (dirent.isDirectory()) {
                                files.add(fullSubPath); 
                                const potentialIndexFile = path.join(fullSubPath, 'index.md');
                                if (fs.existsSync(potentialIndexFile)) {
                                    files.add(potentialIndexFile);
                                }
                            } else if (dirent.isFile() && dirent.name.endsWith('.md')) {
                                files.add(fullSubPath);
                            }
                        }
                    } catch (e) {
                        console.warn(`WARN (watcher): Could not list recipe-book source directory: ${e.message}`);
                    }
                }
            }

            const configSources = configResolver.getConfigFileSources(); 
            
            if (configSources.mainConfigPath && fs.existsSync(configSources.mainConfigPath)) {
                files.add(configSources.mainConfigPath);
            }
            configSources.pluginConfigPaths.forEach(p => {
                if (p && fs.existsSync(p)) files.add(p);
            });
            configSources.cssFiles.forEach(cssPath => { 
                if (fs.existsSync(cssPath)) files.add(cssPath);
            });

            if (effectiveConfig.handlerScriptPath && fs.existsSync(effectiveConfig.handlerScriptPath)) {
                files.add(effectiveConfig.handlerScriptPath);
            }

        } catch (error) {
            console.warn(`WARN (watcher): Could not determine all paths to watch for plugin '${currentArgs.plugin || currentArgs.pluginName}': ${error.message}`);
            if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
                files.add(path.resolve(currentArgs.markdownFile));
            }
            if (currentArgs.config && fs.existsSync(currentArgs.config)) { 
                 files.add(path.resolve(currentArgs.config));
            }
        }
        
        // Add tool's own default config.yaml and XDG global config.yaml from the resolver instance itself
        // These are fixed paths known by the resolver, not dependent on getEffectiveConfig result for *their own paths*
        if (configResolver.defaultMainConfigPath && fs.existsSync(configResolver.defaultMainConfigPath)) {
            files.add(configResolver.defaultMainConfigPath);
        }
        if (configResolver.xdgGlobalConfigPath && fs.existsSync(configResolver.xdgGlobalConfigPath)) {
            files.add(configResolver.xdgGlobalConfigPath);
        }

        return Array.from(files).filter(p => p);
    };

    const rebuild = async (event, filePathTrigger) => {
        if (isProcessing) {
            needsRebuild = true;
            return;
        }
        isProcessing = true;
        needsRebuild = false;
        console.log(`\nDetected ${event} in: ${filePathTrigger}. Rebuilding...`);

        try {
            // commandExecutor (the async wrapper from cli.js) handles creating a new ConfigResolver
            // and calling executeConversion/Generation
            await commandExecutor(args); 

            // After a successful build, re-evaluate paths to watch
            // Create a new ConfigResolver for the current state of args.config
            const newConfigResolverForPaths = new ConfigResolver(args.config);
            const newWatchedPaths = await collectWatchablePaths(newConfigResolverForPaths, args); // **** PASS RESOLVER ****

            const pathsToAdd = newWatchedPaths.filter(p => !watchedPaths.includes(p));
            const pathsToRemove = watchedPaths.filter(p => !newWatchedPaths.includes(p));

            if (watcher) { 
                if (pathsToRemove.length > 0) {
                    watcher.unwatch(pathsToRemove);
                }
                if (pathsToAdd.length > 0) {
                    watcher.add(pathsToAdd);
                }
            }
            watchedPaths = newWatchedPaths;

            if (event === 'unlink' && watchedPaths.includes(filePathTrigger)) {
                if (fs.existsSync(filePathTrigger)) {
                    if (watcher) watcher.add(filePathTrigger);
                }
            }
        } catch (error) {
            console.error(`ERROR during rebuild triggered by ${filePathTrigger} (${event}): ${error.message}`);
            if (error.stack) console.error(error.stack);
        } finally {
            isProcessing = false;
            if (needsRebuild) {
                console.log("Executing queued rebuild...");
                setTimeout(() => {
                    if (!isProcessing) {
                        rebuild("queued", "queued changes");
                    } else {
                        needsRebuild = true;
                    }
                }, 250); 
            } else {
                console.log("Watching for further changes...");
            }
        }
    };
   
    try {
        // Use the configResolverForInitialPaths passed from cli.js for the first collection
        watchedPaths = await collectWatchablePaths(configResolverForInitialPaths, args); // **** PASS RESOLVER ****
    } catch (e) {
        console.error(`ERROR: Failed to collect initial paths for watcher: ${e.message}`);
        watchedPaths = [];
        if (args.markdownFile && fs.existsSync(args.markdownFile)) {
            watchedPaths.push(path.resolve(args.markdownFile));
        }
    }

    if (watchedPaths.length === 0) {
        console.warn("WARN: Watch mode activated, but no files could be identified to watch. Executing command once.");
        try {
            // commandExecutor from cli.js takes (args) and handles ConfigResolver internally
            await commandExecutor(args); 
        } catch(e) {
            console.error(`ERROR during single execution in watch mode (no files watched): ${e.message}`);
        }
        return;
    }

    console.log("\nWatch mode active. Initially monitoring:");
    watchedPaths.forEach(f => console.log(`  - ${f}`));
    console.log("Press Ctrl+C to exit.");
    
    watcher = chokidar.watch(watchedPaths, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
           stabilityThreshold: 300, 
           pollInterval: 100
        }
    });

    watcher
        .on('all', (event, filePath) => {
            if (['add', 'change', 'unlink'].includes(event)) {
                rebuild(event, filePath);
            }
        })
        .on('error', error => console.error(`Watcher error: ${error}`));

    try {
        console.log("Performing initial build for watch mode...");
        // commandExecutor from cli.js takes (args) and handles ConfigResolver internally
        await commandExecutor(args); 
    } catch (e) {
        console.error(`ERROR during initial build in watch mode: ${e.message}`);
    }
}

module.exports = { setupWatch };
