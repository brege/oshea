#!/usr/bin/env node
// scripts/linting/docs/janitor.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  projectRoot,
  fileDiscoveryPath,
  findLitterRulesPath,
  skipSystemPath,
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);
const { shouldSkipLine, shouldSkipFile } = require(skipSystemPath);

const TYPE_RE = /^\[(\w+):(\w+):([\w*,.]+)\]\s+(.+)$/i;
const WHITELIST_RE = /^\[whitelist:(\w+):([\w*,.]+)\]$/i;
const EMOJI_RULE = /^\[emoji:([\w*,.]+)\]$/i;
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u{1F3FB}-\u{1F3FF}|\u{1F9B0}-\u{1F9B3})/gu;

// Using centralized skip system - no more hardcoded constants needed
const CAPS_COMMENT_REGEX = /\b[A-Z]{3,}\b/;

// Cache parsed rules to avoid re-parsing the same file
let rulesCache = null;
let rulesCacheFilepath = null;

function parseRulesFile(filename) {
  // Return cached rules if same file
  if (rulesCache && rulesCacheFilepath === filename) {
    return rulesCache;
  }

  const rules = [];
  let currentMode = null;
  let emojiFiletypes = null;
  let emojiWhitelist = [];
  let customWhitelists = new Map();

  if (!fs.existsSync(filename)) {
    logger.warn(`Rules file not found: ${filename}`, { context: 'Janitor' });
    return { rules, emojiFiletypes: ['*'], emojiWhitelist, customWhitelists, commentCapsWhitelist: [] };
  }

  const lines = fs.readFileSync(filename, 'utf8').split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const emojiMatch = line.match(EMOJI_RULE);
    if (emojiMatch) {
      currentMode = 'emoji';
      emojiFiletypes = emojiMatch[1].split(',').map(s => s.trim());
      continue;
    }

    const whitelistMatch = line.match(WHITELIST_RE);
    if (whitelistMatch) {
      const [, type, filetypes] = whitelistMatch; // eslint-disable-line no-unused-vars
      currentMode = `whitelist:${type}`;
      if (!customWhitelists.has(type)) {
        customWhitelists.set(type, new Set());
      }
      continue;
    }

    const ruleMatch = line.match(TYPE_RE);
    if (ruleMatch) {
      let [, type, severity, ftypes, pattern] = ruleMatch;
      let flags = 'i';
      if (/\$match-case\s*$/.test(pattern)) {
        flags = '';
        pattern = pattern.replace(/\$match-case\s*$/, '').trim();
      }
      const filetypeList = ftypes.split(',').map(ft => ft.trim().toLowerCase());
      rules.push({
        type: type.toLowerCase(),
        severity: severity.toLowerCase(),
        filetypes: filetypeList,
        pattern,
        // Pre-compile regex once during parsing
        regex: new RegExp(pattern.replace(/\*/g, '.*').replace(/\^/g, '\\b'), flags),
        // Pre-compute filetype matching for faster lookups
        matchesAllFiles: filetypeList.includes('*'),
        filetypeSet: new Set(filetypeList)
      });
      currentMode = null;
      continue;
    }

    if (currentMode === 'emoji' && !line.startsWith('[')) {
      emojiWhitelist.push(line);
    } else if (currentMode && currentMode.startsWith('whitelist:') && !line.startsWith('[')) {
      const type = currentMode.split(':')[1];
      customWhitelists.get(type).add(line);
    }
  }

  function makeWhitelistRegexes(set) {
    if (!set) return [];
    return [...set].map(
      pattern => {
        if (pattern.match(/[*.^$|+?()[\]\\]/)) return new RegExp(pattern, 'i');
        return new RegExp(`\\b${pattern}\\b`, 'i');
      }
    );
  }

  const result = {
    rules,
    emojiFiletypes: emojiFiletypes || ['*'],
    emojiWhitelist,
    customWhitelists,
    commentCapsWhitelist: makeWhitelistRegexes(customWhitelists.get('comment'))
  };

  // Cache the parsed result
  rulesCache = result;
  rulesCacheFilepath = filename;

  return result;
}

function scanFileForLitter(filePath, config) {
  // Check if file should be skipped based on .skipignore files
  if (shouldSkipFile(filePath, 'janitor')) {
    return [];
  }

  const { rules, emojiFiletypes, emojiWhitelist, customWhitelists, commentCapsWhitelist } = config;
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();

  // Use pre-computed filetype matching for faster filtering
  const rulesForExt = rules.filter(rule =>
    rule.matchesAllFiles || rule.filetypeSet.has(ext)
  );
  const emojiEnabled = emojiFiletypes.includes('*') || emojiFiletypes.includes(ext);

  lines.forEach((line, index) => {
    if (line.includes('lint-skip-file janitor')) return;

    // Check for line-level and next-line skips
    const prevLine = index > 0 ? lines[index - 1] : '';
    if (shouldSkipLine(line, prevLine, 'janitor')) return;

    for (const rule of rulesForExt) {
      let subject = '';
      if (rule.type === 'comment') {
        const commentIdx = line.indexOf('//');
        if (commentIdx === -1) continue;
        subject = line.slice(commentIdx + 2).trim();

        if (CAPS_COMMENT_REGEX.test(subject)) {
          if (commentCapsWhitelist &&
             commentCapsWhitelist.some(re => re.test(subject))) {
            continue;
          }
        }
      } else if (rule.type === 'string' ||
                 rule.type === 'error') {
        subject = line;
      } else if (rule.type === 'import') {
        if (line.includes('import') || line.includes('require')) {
          subject = line;
        } else {
          continue;
        }
      } else {
        continue;
      }

      if (rule.regex.test(subject)) {
        const whitelist = customWhitelists.get(rule.type);
        const isWhitelisted = whitelist && [...whitelist].some(item =>
          new RegExp(item.replace(/\*/g, '.*').replace(/\^/g, '\\b'), 'i').test(subject)
        );
        if (!isWhitelisted) {
          const match = subject.match(rule.regex);
          issues.push({
            line: index + 1,
            column: match ? (line.indexOf(match[0]) + 1) : 1,
            message: `Found '${rule.pattern}' in a ${rule.type}.`,
            rule: `janitor/${rule.type}`,
            severity: rule.severity === 'high' ? 2 : 1,
            sourceLine: line,
            matchedText: match ? match[0] : null
          });
        }
      }
    }

    const commentIdx = line.indexOf('//');
    if (commentIdx !== -1) {
      const subject = line.slice(commentIdx + 2).trim();
      if (CAPS_COMMENT_REGEX.test(subject) &&
          !(commentCapsWhitelist && commentCapsWhitelist.some(re => re.test(subject)))) {
        issues.push({
          line: index + 1,
          column: commentIdx + 3,
          message: `ALL CAPS comment detected (not whitelisted): "${subject}"`,
          rule: 'janitor/all-caps-comment',
          severity: 1,
          sourceLine: line,
          matchedText: subject.match(CAPS_COMMENT_REGEX)[0]
        });
      }
    }

    if (emojiEnabled) {
      const foundEmojis = [...line.matchAll(EMOJI_REGEX)].map(m => m[0]);
      const disallowed = foundEmojis.filter(e => !emojiWhitelist.includes(e));
      if (disallowed.length > 0) {
        issues.push({
          line: index + 1,
          column: 1,
          message: `Disallowed emoji(s) found: ${disallowed.join(' ')}`,
          rule: 'no-stray-emojis',
          severity: 1,
        });
      }
    }

  });

  return issues;
}

function runLinter(options = {}) {
  const { targets = [], excludes = [], rulesPath, debug = false, filetypes } = options;

  logger.debug(`Loading rules from: ${rulesPath}`, { context: 'Janitor' });
  const janitorConfig = parseRulesFile(rulesPath);

  logger.debug(`Loaded ${janitorConfig.rules.length} rules`, { context: 'Janitor' });

  const allIssues = [];

  const files = findFiles({
    targets: targets,
    ignores: excludes,
    filetypes,
    respectDocignore: true,
    skipTag: 'lint-skip-file janitor',
    debug: debug
  });

  for (const file of files) {
    const fileIssues = scanFileForLitter(file, janitorConfig);
    if (fileIssues.length > 0) {
      allIssues.push(...fileIssues.map(issue => ({
        file: path.relative(projectRoot, file),
        ...issue,
      })));
    }
  }

  const summary = {
    errorCount: allIssues.filter(i => i.severity === 2).length,
    warningCount: allIssues.filter(i => i.severity === 1).length,
    fixedCount: 0,
  };

  return { issues: allIssues, summary, results: [] };
}

if (require.main === module) {
  let config = {};
  try {
    config = loadLintSection('janitor', lintingConfigPath) || {};
  } catch (e) {
    if (!e.message.includes('Section \'janitor\' not found')) {
      logger.warn(`Could not load linting config: ${e.message}`, { context: 'Janitor' });
    }
  }

  const { flags, targets } = parseCliArgs(process.argv.slice(2));

  // Set global debug mode
  logger.setDebugMode(!!flags.debug);
  const finalTargets = targets.length > 0 ? targets : (config.targets || ['.']);
  const excludes = flags.force ? [] : (config.excludes || []);
  const filetypes = config.filetypes;

  const rulesPathToUse =
        flags.rules ||
        findLitterRulesPath ||
        'assets/litter-list.txt';

  const absRulesPath = path.resolve(process.cwd(), rulesPathToUse);
  logger.debug('Using rules file:', { context: 'Janitor', path: absRulesPath });

  const { issues, summary } = runLinter({
    targets: finalTargets,
    excludes,
    rulesPath: absRulesPath,
    debug: flags.debug,
    filetypes,
    ...flags,
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };

