# Next-Generation Testing Framework

## Overview

Building on the existing rank/level test classification system, this document outlines enhancements for intelligent test execution and historical tracking.

## Current Foundation

### Test Classification
- **Rank** (0-2): Criticality level
  - `rank0`: Core operations (default-handler, pdf-generator)
  - `rank1`: Essential operations (config-resolver, plugin-determiner)
  - `rank2`: Supportive operations (plugin-manager, math-integration)

- **Level** (1-4): Integration scope
  - `level1`: Module integration tests
  - `level2`: Subsystem integration tests
  - `level3`: Module E2E tests
  - `level4`: Workflow E2E tests

### Smart Test Logging
New `test-failures.json` format preserves test history across partial runs:
- Entry-level updates (not file overwrites)
- Timestamp tracking per test
- Unique keying: `${file}::${title}`
- NDJSON format for streaming/parsing

## Proposed Enhancements

### Volatility Dimension
Add historical stability classification:
- **volatility0**: Stable tests, rarely fail
- **volatility1**: Occasionally flaky
- **volatility2**: Frequently unstable

Complete classification: `rank0-level2-volatility0`

### Dependency-Based Testing
Leverage existing [`paths/dep-tree.js`](../../paths/dep-tree.js) for smart test selection:

```bash
# Current: Run all 300+ tests
npm test

# Smart: Run only affected tests
git diff --name-only | deps-to-tests | npm test --grep
```

### Pre-Push Hook Strategy
```bash
# Lean pre-push: Run only volatility0 tests for changed files
# Fast confidence check before push
# Full CI runs complete suite
```

### Enhanced Test Metadata
```json
{
  "test_id": "default-handler::2.2.1",
  "rank": 0, "level": 2, "volatility": 0,
  "last_success": "2025-07-26T18:28:41.260Z",
  "last_failure": "2025-07-20T14:32:12.145Z", 
  "failure_rate": 0.02,
  "avg_duration": 13,
  "affected_by": ["src/core/default-handler.js"]
}
```

## Implementation Path

1. Volatility tracking via test history analysis
2. Dependency mapping integration with [`paths/dep-tree.js`](../../paths/dep-tree.js)
3. Smart pre-push hooks
4. QA dashboard integration for CI monitoring (watchtower)

## Benefits

- **Faster feedback.**        Run relevant tests, not everything
- **Predictive reliability.** Focus on volatile tests for stabilization
- **Efficient CI.**           Resource optimization through smart selection
- **Historical insight.**     Track patterns across test classifications

## Technical Notes

- Maintains existing [`.mocharc.js`](../../.mocharc.js) group system
- NDJSON format enables incremental processing
- Compatible with current test structure and paths system
- Builds on established rank/level classification

