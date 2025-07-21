// scripts/batch/batch-convert-hugo-recipes.js
require('module-alias/register');
const { loggerPath, cliPath } = require('@paths');
const logger = require(loggerPath);

const { exec } = require('child_process');
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

logger.info(`cliPath, ${cliPath}`);

// --- Argument Parsing ---
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --source-dir <path> --output-dir <path> --plugin <name>')
  .option('source-dir', {
    alias: 's',
    describe: 'Source directory containing Markdown files (e.g., ./examples/hugo-example)',
    type: 'string',
    demandOption: true
  })
  .option('output-dir', {
    alias: 'o',
    describe: 'Base directory to save generated PDFs',
    type: 'string',
    demandOption: true
  })
  .option('plugin', {
    alias: 'p',
    describe: 'The md-to-pdf plugin to use for styling each document',
    type: 'string',
    default: 'recipe'
  })
  .option('md-to-pdf-path', {
    describe: 'Path to the md-to-pdf cli.js script',
    type: 'string',
    default: path.resolve(__dirname, cliPath)
  })
  .epilog('For help, run with --help. All logs are detailed.').help('help')
  .alias('help', 'h')
  .argv;

if (argv.help) {
  logger.detail(`
Batch convert Markdown to PDF using md-to-pdf.

  --source-dir, -s      Source directory containing Markdown recipe folders
  --output-dir, -o      Output directory to save generated PDFs
  --plugin, -p          The md-to-pdf plugin to use for styling (default "recipe")
  --md-to-pdf-path      Path to md-to-pdf cli.js script (default: autodetected)
  -h, --help            Show this help

Example:
  node scripts/batch/batch-convert-hugo-recipes.js -s ./examples/hugo-example -o ./pdfs -p cv
`);
  process.exit(0);
}

// --- Configuration from Arguments ---
const sourceBaseDir = path.resolve(argv.sourceDir);
const outputBaseDir = path.resolve(argv.outputDir);
const basePlugin = argv.plugin;
const mdToPdfCliPath = path.resolve(argv.mdToPdfPath);

// Function to generate a slug (simplified version)
function generateSlug(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

// Function to extract author from Markdown content (example, adapt as needed)
function extractAuthorFromContent(content) {
  const chefMatch = content.match(/^\*\*Chef:\s*(.*)\*\*/im);
  if (chefMatch && chefMatch[1]) {
    return generateSlug(chefMatch[1].trim());
  }
  return '';
}

async function processRecipe(markdownFilePath) {
  try {
    logger.info(`Processing: ${markdownFilePath}`);
    const rawContent = await fs.readFile(markdownFilePath, 'utf8');
    const { data: frontMatter, content: bodyContent } = matter(rawContent);

    const itemSlug = path.basename(path.dirname(markdownFilePath));
    const title = frontMatter.title || itemSlug.replace(/-/g, ' ');

    let author = '';
    if (frontMatter.author_credit) {
      author = generateSlug(frontMatter.author_credit);
    } else {
      const bodyAuthor = extractAuthorFromContent(bodyContent);
      if (bodyAuthor) author = bodyAuthor;
    }

    const date = frontMatter.date ? new Date(frontMatter.date).toISOString().split('T')[0] : '';

    let outputFilename = generateSlug(title);
    if (author) outputFilename += `-${author}`;
    if (date) outputFilename += `-${date}`;
    outputFilename += '.pdf';
    outputFilename = outputFilename.replace(/--+/g, '-').replace(/^-|-$/g, '');

    const itemOutputDir = path.join(outputBaseDir, itemSlug);
    if (!fss.existsSync(itemOutputDir)) {
      await fs.mkdir(itemOutputDir, { recursive: true });
    }
    const outputPdfPath = path.join(itemOutputDir, outputFilename);

    const mdToPdfCommand = [
      'node',
      `"${mdToPdfCliPath}"`,
      'convert',
      `"${markdownFilePath}"`,
      '--plugin', basePlugin,
      '--outdir', `"${itemOutputDir}"`,
      '--filename', `"${outputFilename}"`,
      '--no-open'
    ].join(' ');

    logger.detail(`  Executing: ${mdToPdfCommand}`);

    return new Promise((resolve, reject) => {
      exec(mdToPdfCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error(`  ERROR converting ${markdownFilePath}: ${error.message}`);
          if (stderr) logger.error(`  Stderr: ${stderr}`);
          return reject(error);
        }
        if (stderr) {
          logger.warn(`  Stderr during conversion of ${markdownFilePath}: ${stderr}`);
        }
        logger.success(`  Successfully generated: ${outputPdfPath}`);
        resolve(outputPdfPath);
      });
    });

  } catch (err) {
    logger.error(`Failed to process file ${markdownFilePath}: ${err}`);
    return Promise.reject(err);
  }
}

async function main() {
  logger.info('Starting batch conversion (Node.js script)...');
  logger.info(`Source directory: ${sourceBaseDir}`);
  logger.info(`Output directory: ${outputBaseDir}`);
  logger.info(`Plugin: ${basePlugin}`);
  logger.info(`md-to-pdf CLI path: ${mdToPdfCliPath}`);

  if (!fss.existsSync(sourceBaseDir)) {
    logger.error(`Source directory does not exist: ${sourceBaseDir}`);
    process.exit(1);
  }
  if (!fss.existsSync(outputBaseDir)) {
    await fs.mkdir(outputBaseDir, { recursive: true });
  }
  if (!fss.existsSync(mdToPdfCliPath)) {
    logger.error(`md-to-pdf CLI script not found at: ${mdToPdfCliPath}. Please check the path or install md-to-pdf globally.`);
    process.exit(1);
  }

  const filesToProcess = glob.sync('**/index.md', { cwd: sourceBaseDir, absolute: true });

  if (filesToProcess.length === 0) {
    logger.warn('No Markdown files found to process with pattern "**/index.md".');
    return;
  }
  logger.info(`Found ${filesToProcess.length} recipes to process.`);

  for (const filePath of filesToProcess) {
    try {
      await processRecipe(filePath);
    } catch {
      logger.error(`Skipping ${filePath} due to error.`);
    }
  }
  logger.info('Batch processing complete.');
}

main().catch(err => {
  logger.error('Batch script failed:', err);
  process.exit(1);
});
