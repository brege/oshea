#!/usr/bin/env node
// scripts/linting/docs/find-litter.js

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
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);

const TYPE_RE = /^\[(\w+):(\w+):([\w*,.]+)\]\s+(.+)$/i;
const WHITELIST_RE = /^\[whitelist:(\w+):([\w*,.]+)\]$/i;
const EMOJI_RULE = /^\[emoji:([\w*,.]+)\]$/i;
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u{1F3FB}-\u{1F3FF}|\u{1F9B0}-\u{1F9B3})/gu;

const LINT_SKIP_TAG = 'lint-skip-litter';
const CAPS_COMMENT_REGEX = /\b[A-Z]{3,}\b/;

function parseRulesFile(filename) {
  const rules = [];
  let currentMode = null;
  let emojiFiletypes = null;
  let emojiWhitelist = [];
  let customWhitelists = new Map();

  if (!fs.existsSync(filename)) {
    logger.warn(`[WARN] Rules file not found: ${filename}`);
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
      rules.push({
        type: type.toLowerCase(),
        severity: severity.toLowerCase(),
        filetypes: ftypes.split(',').map(ft => ft.trim().toLowerCase()),
        pattern,
        regex: new RegExp(pattern.replace(/\*/g, '.*').replace(/\^/g, '\\b'), flags),
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
        if (pattern.match(/[*.^$|+?()[\]\\]/)) return new RegExp(pattern);
        return new RegExp(`\\b${pattern}\\b`);
      }
    );
  }

  return {
    rules,
    emojiFiletypes: emojiFiletypes || ['*'],
    emojiWhitelist,
    customWhitelists,
    commentCapsWhitelist: makeWhitelistRegexes(customWhitelists.get('comment'))
  };
}

function scanFileForLitter(filePath, config) {
  const { rules, emojiFiletypes, emojiWhitelist, customWhitelists, commentCapsWhitelist } = config;
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();

  const rulesForExt = rules.filter(rule =>
    rule.filetypes.includes('*') || rule.filetypes.includes(ext)
  );
  const emojiEnabled = emojiFiletypes.includes('*') || emojiFiletypes.includes(ext);

  lines.forEach((line, index) => {
    if (line.includes(LINT_SKIP_TAG)) return;

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
            rule: `find-litter/${rule.type}`,
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
          rule: 'find-litter/all-caps-comment',
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

  logger.debug(`[DEBUG] Loading rules from: ${rulesPath}`);
  const litterConfig = parseRulesFile(rulesPath);

  logger.debug(`[DEBUG] Loaded ${litterConfig.rules.length} rules`);

  const allIssues = [];

  const files = findFiles({
    targets: targets,
    ignores: excludes,
    filetypes,
    respectDocignore: true,
    skipTag: LINT_SKIP_TAG,
    debug: debug
  });

  for (const file of files) {
    const fileIssues = scanFileForLitter(file, litterConfig);
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
    config = loadLintSection('find-litter', lintingConfigPath) || {};
  } catch (e) {
    if (!e.message.includes('Section \'find-litter\' not found')) {
      logger.warn(`[WARN] Could not load linting config: ${e.message}`);
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
  logger.debug('[DEBUG] Using rules file:', absRulesPath);

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

