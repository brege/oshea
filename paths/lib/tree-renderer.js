// paths/lib/tree-renderer.js

require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

class TreeRenderer {
  constructor(trees) {
    this.trees = trees;
  }

  render() {
    const visited = new Set();
    this.trees.forEach((tree, index) => {
      if (tree) this._printNode(tree, visited, '', index === this.trees.length - 1);
    });
  }

  _printNode(node, visited, indent = '', isLast = true) {
    if (!node || !node.file) return;

    const prefix = indent + (isLast ? '└── ' : '├── ');
    const nodeLabel = node.file;
    let varLabel = '';

    if(node.isPreset){
      varLabel = '(preset)';
    } else if (node.registryVar){
      varLabel = `(${node.registryVar})`;
    }

    if (visited.has(nodeLabel) && !node.isPreset) {
      logger.detail(`${prefix}${nodeLabel} ${varLabel} (collapsed)\n`, { format: 'inline' });
      return;
    }

    logger.info(`${prefix}${nodeLabel} ${varLabel}\n`, { format: 'inline' });
    visited.add(nodeLabel);

    if (Array.isArray(node.dependencies)) {
      const newIndent = indent + (isLast ? '    ' : '│   ');
      node.dependencies.forEach((dep, index) => {
        this._printNode(dep, visited, newIndent, index === node.dependencies.length - 1);
      });
    }
  }
}

module.exports = { TreeRenderer };
