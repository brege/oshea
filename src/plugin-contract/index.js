const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const getPluginMetadata = require('./metadata');
const v1_checks = require('./v1');

const handleValidationCommand = async (pluginIdentifier, options = {}) => {
    try {
        const { pluginDirectoryPath, pluginName } = resolvePluginPath(pluginIdentifier);
        const warnings = [];
        const errors = [];

        console.log(chalk.bold(`Running validation for '${pluginName}'...`));

        const metadata = getPluginMetadata(pluginDirectoryPath, pluginName, warnings);

        // --- FIX: Add the missing name mismatch check ---
        if (metadata.plugin_name.value !== pluginName) {
            errors.push(`Resolved 'plugin_name' ('${metadata.plugin_name.value}') does not match plugin directory name ('${pluginName}').`);
        }
        // --- END FIX ---

        const protocol = metadata.protocol.value || 'v1';

        // ... (rest of the logic remains the same)
        let checksToRun = [];
        if (protocol === 'v1') {
            if (options.structuralOnly) {
                checksToRun.push({ name: 'File Structure', func: v1_checks.checkFileStructure });
            } else if (options.testOnly) {
                checksToRun.push({ name: 'In-Situ Test', func: v1_checks.runInSituTest });
            } else {
                checksToRun = [
                    { name: 'File Structure', func: v1_checks.checkFileStructure },
                    { name: 'In-Situ Test', func: v1_checks.runInSituTest },
                    { name: 'Self-Activation', func: v1_checks.runSelfActivation }
                ];
            }
        } else {
             throw new Error(`Unsupported protocol: ${protocol}`);
        }

        for (const check of checksToRun) {
            console.log(chalk.cyan(`\nChecking: ${check.name}...`));
            await check.func(pluginDirectoryPath, pluginName, errors, warnings);
        }

        const summary = [`\n--- Summary for ${pluginName} ---`];

        if (errors.length > 0) {
            summary.push(`[INVALID] Plugin is INVALID.`);
            summary.push(`\nErrors:`);
            errors.forEach(e => summary.push(`  - ${e}`));
        } else if (warnings.length > 0) {
            summary.push(`[USABLE] Plugin is USABLE (with warnings).`);
        } else {
            summary.push(`[VALID] Plugin is VALID.`);
        }

        if (warnings.length > 0) {
            summary.push(`\nWarnings:`);
            warnings.forEach(w => summary.push(`  - ${w}`));
        }
        
        console.log(summary.join('\n'));
        
        if (errors.length > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error(error.message); // This will go to stderr
        process.exit(1);
    }
};

function resolvePluginPath(pluginIdentifier) {
    const resolvedIdentifier = path.resolve(pluginIdentifier);
    if (fs.existsSync(resolvedIdentifier) && fs.statSync(resolvedIdentifier).isDirectory()) {
        return { pluginDirectoryPath: resolvedIdentifier, pluginName: path.basename(resolvedIdentifier) };
    }
    const projectRoot = path.resolve(__dirname, '../../');
    const pluginDirectoryPath = path.join(projectRoot, 'plugins', pluginIdentifier);
    if (!fs.existsSync(pluginDirectoryPath) || !fs.statSync(pluginDirectoryPath).isDirectory()) {
        throw new Error(`Error: Plugin directory not found for identifier: '${pluginIdentifier}'.`);
    }
    return { pluginDirectoryPath, pluginName: pluginIdentifier };
}

module.exports = { handleValidationCommand };
