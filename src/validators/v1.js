// src/validators/v1.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const os = require('os');
const { projectRoot, cliPath, mochaPath, nodeModulesPath, loggerPath } = require('@paths');
const logger = require(loggerPath);


function checkReadmeFrontMatterV1(readmePath, pluginName, warnings) {
  logger.info('  Checking README.md front matter... ', {
    context: 'V1Validator',
    format: 'inline',
    plugin: pluginName,
    readmePath: readmePath
  });
  if (!fs.existsSync(readmePath)) {
    logger.warn('⚠ SKIP\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      reason: 'README.md not found'
    });
    return;
  }
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const frontMatterDelimiter = '---';
  const parts = readmeContent.split(frontMatterDelimiter);
  if (parts.length < 3 || parts[0].trim() !== '') {
    warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
    logger.warn('⚠ WARN\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.warn('    ⚠ README.md does not have a valid YAML front matter block.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      reason: 'Missing or malformed front matter delimiters.'
    });
    return;
  }
  try {
    const frontMatter = yaml.load(parts[1]);
    if (!frontMatter || typeof frontMatter !== 'object') {
      warnings.push(`README.md for '${pluginName}' has invalid front matter.`);
      logger.warn('⚠ WARN\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName
      });
      logger.warn('    ⚠ README.md has invalid front matter.\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        reason: 'Front matter is empty or not an object.'
      });
      return;
    }
    logger.success('✓ OK\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.success('    ✓ README.md has a valid front matter block.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  } catch (e) {
    warnings.push(`Could not parse README.md front matter for '${pluginName}': ${e.message}.`);
    logger.warn('⚠ WARN\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.warn('    ⚠ Could not parse README.md front matter.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      error: e.message
    });
  }
}


const checkFileStructure = (pluginDirectoryPath, pluginName, errors, warnings) => {
  logger.info('  Checking plugin file structure... ', {
    context: 'V1Validator',
    format: 'inline',
    plugin: pluginName
  });
  const requiredFiles = ['index.js', `${pluginName}.config.yaml`, `${pluginName}-example.md`, 'README.md'];
  let allRequiredFound = true;

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(pluginDirectoryPath, file))) {
      errors.push(`Missing required file: '${file}'.`);
      allRequiredFound = false;
    }
  }

  if (allRequiredFound) {
    logger.success('✓ OK\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  } else {
    logger.error('✗ FAIL\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  }

  // Show detailed file results
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(pluginDirectoryPath, file))) {
      logger.success('    ✓ Found required file: ', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        file: file
      });
      // Appending file name directly to message because of the specific output request.
      // This is a direct string concatenation.
      process.stdout.write(`'${file}'\n`);
    } else {
      logger.error('    ✗ Missing required file: ', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        file: file
      });
      // Appending file name directly to message because of the specific output request.
      process.stdout.write(`'${file}'\n`);
    }
  }

  logger.info('  Checking for optional files... ', {
    context: 'V1Validator',
    format: 'inline',
    plugin: pluginName
  });
  const contractDir = path.join(pluginDirectoryPath, '.contract');
  const testDir = path.join(contractDir, 'test');
  const schemaFileName = `${pluginName}.schema.json`;
  const schemaPath = path.join(contractDir, schemaFileName);

  let optionalCount = 0;
  if (fs.existsSync(testDir)) optionalCount++;
  if (fs.existsSync(schemaPath)) optionalCount++;

  if (optionalCount === 2) {
    logger.success('✓ OK\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  } else if (optionalCount === 1) {
    logger.warn('⚠ PARTIAL\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  } else {
    logger.warn('⚠ NONE\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  }

  // Show detailed optional file results
  if (fs.existsSync(testDir)) {
    logger.success('    ✓ Found optional \'.contract/test/\' directory.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      directory: '.contract/test/'
    });
  } else {
    warnings.push('Missing optional \'.contract/test/\' directory.');
    logger.warn('    ⚠ Missing optional \'.contract/test/\' directory.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      directory: '.contract/test/'
    });
  }

  if (fs.existsSync(schemaPath)) {
    logger.success(`    ✓ Plugin has a schema file ('${schemaFileName}').\n`, {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      file: schemaFileName
    });
  } else {
    warnings.push(`Missing optional schema file ('${schemaFileName}') in .contract/ directory.`);
    logger.warn('    ⚠ Plugin does not have a specific schema file in .contract/ directory.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      file: schemaFileName
    });
  }
};


const runInSituTest = (pluginDirectoryPath, pluginName, errors, warnings) => {
  logger.info('  Checking plugin\'s test setup... ', {
    context: 'V1Validator',
    format: 'inline',
    plugin: pluginName
  });
  const e2eTestPath = path.join(pluginDirectoryPath, '.contract', 'test', `${pluginName}-e2e.test.js`);
  if (!fs.existsSync(e2eTestPath)) {
    warnings.push(`Missing E2E test file, skipping test run: '${path.join('.contract/test', `${pluginName}-e2e.test.js`)}'.`);
    logger.warn('⚠ SKIP\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.warn('    ⚠ Missing E2E test file, skipping run.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      file: path.join('.contract/test', `${pluginName}-e2e.test.js`)
    });
    return;
  }
  // Continue inline without premature OK status - we'll show it after the test runs
  try {
    logger.info('\n  Running in-situ E2E test...', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    const command = `node "${mochaPath}" "${e2eTestPath}" --no-config --no-opts`;
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath
      }
    });
    logger.success('✓ OK\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.success('    ✓ In-situ test passes.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });

    // Show clean test results using inline format
    if (result && result.length > 0) {
      const testOutput = result.toString().trim();
      const lines = testOutput.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Test suite headers
        if (trimmedLine.match(/^\s*[A-Z].*Test\s*$/)) {
          logger.info('      Test Suite: ', {
            context: 'V1Validator',
            format: 'inline',
            plugin: pluginName,
            suite: trimmedLine
          });
          process.stdout.write(`${trimmedLine}\n`); // Direct print for exact formatting
          continue;
        }

        // Test result lines
        if (trimmedLine.includes('✔') || trimmedLine.includes('✓')) {
          const testName = trimmedLine.replace(/^\s*✔?\s*/, '').replace(/\s*\(\d+ms\)$/, '');
          logger.success('        ✓ ', {
            context: 'V1Validator',
            format: 'inline',
            plugin: pluginName,
            test: testName
          });
          process.stdout.write(`${testName}\n`); // Direct print for exact formatting
          continue;
        }

        // Test summary
        if (trimmedLine.match(/^\d+\s+passing/)) {
          logger.success('      ', {
            context: 'V1Validator',
            format: 'inline',
            plugin: pluginName,
            summary: trimmedLine
          });
          process.stdout.write(`${trimmedLine}\n`); // Direct print for exact formatting
          continue;
        }

        // Other meaningful output
        if (trimmedLine.includes('Successfully created') ||
            trimmedLine.includes('Generated') ||
            trimmedLine.startsWith('[')) {
          logger.info('      ', {
            context: 'V1Validator',
            format: 'inline',
            plugin: pluginName,
            outputLine: trimmedLine
          });
          process.stdout.write(`${trimmedLine}\n`); // Direct print for exact formatting
        }
      }
    }
  } catch (e) {
    errors.push('In-situ E2E test failed');
    logger.error('✗ FAIL\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.error('    ✗ In-situ test failed.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });

    if (e.stdout && e.stdout.length > 0) {
      logger.error('      Test stdout:\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName
      });
      logger.error('', { // Empty message, all content in data
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        output: e.stdout.toString() + '\n' // Include newline in data for specific output
      });
    }
    if (e.stderr && e.stderr.length > 0) {
      logger.error('      Test stderr:\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName
      });
      logger.error('', { // Empty message, all content in data
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        output: e.stderr.toString() + '\n' // Include newline in data for specific output
      });
    }
    if ((!e.stdout || e.stdout.length === 0) && (!e.stderr || e.stderr.length === 0)) {
      logger.error('      No output captured from test process.\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName
      });
    }
  }
};


const runSelfActivation = (pluginDirectoryPath, pluginName, errors) => {
  logger.info('  Performing self-activation sanity check... ', {
    context: 'V1Validator',
    format: 'inline',
    plugin: pluginName
  });
  const exampleMdPath = path.join(pluginDirectoryPath, `${pluginName}-example.md`);
  const configYamlPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
  if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
    errors.push('Self-activation failed: The plugin is missing its example.md or config.yaml file.');
    logger.error('✗ FAIL\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.error('    ✗ Self-activation check failed (missing example/config).\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      missingFiles: [`${pluginName}-example.md`, `${pluginName}.config.yaml`]
    });
    return;
  }
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `md-to-pdf-test-${pluginName}-`));
  logger.debug('Created temporary output directory for self-activation test', {
    context: 'V1Validator',
    pluginName: pluginName,
    tempDir: tempOutputDir
  });
  try {
    const command = `node "${cliPath}" convert "${exampleMdPath}" --outdir "${tempOutputDir}" --no-open`;
    execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath
      }
    });
    logger.success('✓ OK\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.success('    ✓ Self-activation successful.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      exampleFile: exampleMdPath,
      outputDir: tempOutputDir
    });
  } catch (e) {
    errors.push('Self-activation failed: The plugin was unable to convert its own example file.');
    logger.error('✗ FAIL\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.error('    ✗ Self-activation check failed.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName,
      error: e.message
    });
    if (e.stderr) {
      logger.error('      Self-activation error output:\n', {
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName
      });
      logger.error('', { // Empty message, all content in data
        context: 'V1Validator',
        format: 'inline',
        plugin: pluginName,
        output: e.stderr.toString() + '\n' // Include newline in data for specific output
      });
    }
  } finally {
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
    logger.debug('Cleaned up temporary output directory for self-activation test', {
      context: 'V1Validator',
      tempDir: tempOutputDir
    });
  }
};


function validateV1(pluginDirectoryPath, pluginMetadata) {
  const errors = [];
  const warnings = [];
  const pluginName = pluginMetadata.plugin_name.value;

  logger.info('Starting V1 plugin validation checks', {
    context: 'V1Validator',
    pluginName: pluginName,
    pluginDirectoryPath: pluginDirectoryPath
  });

  checkFileStructure(pluginDirectoryPath, pluginName, errors, warnings);
  runInSituTest(pluginDirectoryPath, pluginName, errors, warnings);
  const readmePath = path.join(pluginDirectoryPath, 'README.md');
  checkReadmeFrontMatterV1(readmePath, pluginName, warnings);
  if (errors.length === 0) {
    runSelfActivation(pluginDirectoryPath, pluginName, errors); // Removed warnings arg as it's not used by runSelfActivation
  } else {
    warnings.push('Skipping self-activation check due to prior critical errors.');
    logger.info('  Performing self-activation sanity check... ', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.warn('⚠ SKIP\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
    logger.warn('    ⚠ Skipping self-activation check due to prior errors.\n', {
      context: 'V1Validator',
      format: 'inline',
      plugin: pluginName
    });
  }
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

module.exports = {
  validateV1,
  checkFileStructure,
  runInSituTest,
  runSelfActivation,
  checkReadmeFrontMatterV1
};
