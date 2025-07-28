// test/runners/e2e/unified-plugin-workflow.test.js
// Level 4 End-to-End Smoke Test: Unified Plugin Architecture Workflow
//
// Tests the complete unified plugin lifecycle for CI:
// 1. Collection management (add collections with multiple plugins)
// 2. Plugin creation (create plugins externally with --outdir)
// 3. Plugin addition (add external plugins to unified structure)
// 4. Plugin enable/disable (test state management across types)
// 5. Plugin listing (verify correct status reporting)
// 6. Document conversion (use created and added plugins with --open=false)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { expect } = require('chai');

describe('Level 4: Unified Plugin Architecture Workflow (Smoke Test)', function() {
  this.timeout(60000); // 60 second timeout for CI operations

  let testCollRoot;
  let tempCreationDirMulti;
  let tempCreationDirSingle;
  let testMarkdownFile;

  before(async function() {
    // Create temporary collections root for testing
    testCollRoot = path.join(os.tmpdir(), `md-to-pdf-test-coll-${Date.now()}`);
    fs.mkdirSync(testCollRoot, { recursive: true });

    // Create temporary directories for plugin creation
    tempCreationDirMulti = path.join(os.tmpdir(), `md-to-pdf-create-multi-${Date.now()}`);
    tempCreationDirSingle = path.join(os.tmpdir(), `md-to-pdf-create-single-${Date.now()}`);
    fs.mkdirSync(tempCreationDirMulti, { recursive: true });
    fs.mkdirSync(tempCreationDirSingle, { recursive: true });

    // Create test markdown file
    testMarkdownFile = path.join(os.tmpdir(), `test-document-${Date.now()}.md`);
    fs.writeFileSync(testMarkdownFile, `# Level 4 Test Document

This is a comprehensive test document for the unified plugin architecture.

## Test Content

- **Plugin A Test**: This content will be processed by plugin-A
- **Plugin B Test**: This content will be processed by plugin-B
- **Plugin X Test**: This content will be processed by plugin-X

The unified architecture should handle all plugin types seamlessly.

### Test List
1. Created plugins (from bundled sources)
2. Added plugins (from external directories)
3. State management (enable/disable)
4. Status reporting (User created/added)

**Test completed successfully!**`);
  });

  after(function() {
    // Cleanup test directories
    try {
      fs.rmSync(testCollRoot, { recursive: true, force: true });
      fs.rmSync(tempCreationDirMulti, { recursive: true, force: true });
      fs.rmSync(tempCreationDirSingle, { recursive: true, force: true });
      fs.unlinkSync(testMarkdownFile);
    } catch (e) {
      // Ignore cleanup errors in CI
    }
  });

  describe('Phase 1: Collection Setup', function() {
    it('4.1.5a: should add test collections for plugin source references', function() {
      // Verify dummy collections exist in current directory
      expect(fs.existsSync('./dummy-collection')).to.be.true;
      expect(fs.existsSync('./dummy-singletons')).to.be.true;

      // Add test collections (using dummy collections from repo)
      const addCmd1 = `node cli.js collection add ./dummy-collection --coll-root "${testCollRoot}"`;
      const addCmd2 = `node cli.js collection add ./dummy-singletons --coll-root "${testCollRoot}"`;

      const result1 = execSync(addCmd1, { encoding: 'utf8', cwd: process.cwd() });
      const result2 = execSync(addCmd2, { encoding: 'utf8', cwd: process.cwd() });

      expect(result1).to.include('Successfully copied local source');
      expect(result2).to.include('Successfully copied local source');

      // Verify collections directory structure
      expect(fs.existsSync(path.join(testCollRoot, 'collections', 'dummy-collection'))).to.be.true;
      expect(fs.existsSync(path.join(testCollRoot, 'collections', 'dummy-singletons'))).to.be.true;
    });
  });

  describe('Phase 2: External Plugin Creation Workflow', function() {
    it('4.1.5b: should create multiple plugins externally using --outdir', function() {
      // Create plugin-A from default template
      const createCmdA = `node cli.js plugin create plugin-A --from default --outdir "${tempCreationDirMulti}"`;
      const resultA = execSync(createCmdA, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultA).to.include('Plugin \'plugin-A\' created successfully');
      expect(resultA).to.include('Archetype created successfully');
      expect(fs.existsSync(path.join(tempCreationDirMulti, 'plugin-A'))).to.be.true;

      // Create plugin-B from default template
      const createCmdB = `node cli.js plugin create plugin-B --from default --outdir "${tempCreationDirMulti}"`;
      const resultB = execSync(createCmdB, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultB).to.include('Plugin \'plugin-B\' created successfully');
      expect(fs.existsSync(path.join(tempCreationDirMulti, 'plugin-B'))).to.be.true;
    });

    it('4.1.5c: should create single plugin externally for individual testing', function() {
      // Create plugin-X from default template in separate directory
      const createCmdX = `node cli.js plugin create plugin-X --from default --outdir "${tempCreationDirSingle}"`;
      const resultX = execSync(createCmdX, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultX).to.include('Plugin \'plugin-X\' created successfully');
      expect(fs.existsSync(path.join(tempCreationDirSingle, 'plugin-X'))).to.be.true;
      expect(fs.existsSync(path.join(tempCreationDirSingle, 'plugin-X', 'plugin-X.config.yaml'))).to.be.true;
    });
  });

  describe('Phase 3: Plugin Addition to Unified Structure', function() {
    it('4.1.5d: should add externally created plugins to unified architecture', function() {
      // Add plugin-A to unified structure
      const pluginAPath = path.join(tempCreationDirMulti, 'plugin-A');
      const addCmdA = `node cli.js plugin add "${pluginAPath}" --coll-root "${testCollRoot}"`;
      const resultA = execSync(addCmdA, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultA).to.include('Singleton plugin added and enabled');

      // Add plugin-B to unified structure
      const pluginBPath = path.join(tempCreationDirMulti, 'plugin-B');
      const addCmdB = `node cli.js plugin add "${pluginBPath}" --coll-root "${testCollRoot}"`;
      const resultB = execSync(addCmdB, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultB).to.include('Singleton plugin added and enabled');

      // Add plugin-X to unified structure
      const pluginXPath = path.join(tempCreationDirSingle, 'plugin-X');
      const addCmdX = `node cli.js plugin add "${pluginXPath}" --coll-root "${testCollRoot}"`;
      const resultX = execSync(addCmdX, { encoding: 'utf8', cwd: process.cwd() });

      expect(resultX).to.include('Singleton plugin added and enabled');

      // Verify unified structure
      const userPluginsDir = path.join(testCollRoot, 'user-plugins');
      expect(fs.existsSync(userPluginsDir)).to.be.true;
      expect(fs.existsSync(path.join(userPluginsDir, 'plugin-A'))).to.be.true;
      expect(fs.existsSync(path.join(userPluginsDir, 'plugin-B'))).to.be.true;
      expect(fs.existsSync(path.join(userPluginsDir, 'plugin-X'))).to.be.true;
      expect(fs.existsSync(path.join(userPluginsDir, 'plugins.yaml'))).to.be.true;
    });

    it('4.1.5e: should verify unified manifest contains all added plugins', function() {
      const manifestPath = path.join(testCollRoot, 'user-plugins', 'plugins.yaml');
      const manifest = fs.readFileSync(manifestPath, 'utf8');

      expect(manifest).to.include('plugin-A');
      expect(manifest).to.include('plugin-B');
      expect(manifest).to.include('plugin-X');
      expect(manifest).to.include('type: added');
      expect(manifest).to.include('enabled: true');
    });
  });

  describe('Phase 4: Plugin State Management Smoke Test', function() {
    it('4.1.5f: should list all plugins with correct unified status types', function() {
      const listCmd = `node cli.js plugin list --coll-root "${testCollRoot}"`;
      const result = execSync(listCmd, { encoding: 'utf8', cwd: process.cwd() });

      // Verify status types for unified architecture
      expect(result).to.include('Enabled (Added)');
      expect(result).to.include('User (added)');

      // Verify plugin names appear
      expect(result).to.include('plugin-A');
      expect(result).to.include('plugin-B');
      expect(result).to.include('plugin-X');
    });

    it('4.1.5g: should disable and enable plugin for state management test', function() {
      // Disable plugin-A
      const disableCmd = `node cli.js plugin disable plugin-A --coll-root "${testCollRoot}"`;
      const disableResult = execSync(disableCmd, { encoding: 'utf8', cwd: process.cwd() });
      expect(disableResult).to.include('Plugin disabled successfully');

      // Verify status change in available list
      const listCmd1 = `node cli.js plugin list --available --coll-root "${testCollRoot}"`;
      const listResult1 = execSync(listCmd1, { encoding: 'utf8', cwd: process.cwd() });
      expect(listResult1).to.include('Available (Added)');
      expect(listResult1).to.include('plugin-A');

      // Re-enable plugin-A
      const enableCmd = `node cli.js plugin enable plugin-A --coll-root "${testCollRoot}"`;
      const enableResult = execSync(enableCmd, { encoding: 'utf8', cwd: process.cwd() });
      expect(enableResult).to.include('Plugin enabled successfully');
    });

    it('4.1.5h: should show table format with status symbols', function() {
      const listCmd = `node cli.js plugin list --short --coll-root "${testCollRoot}"`;
      const result = execSync(listCmd, { encoding: 'utf8', cwd: process.cwd() });

      // Verify table format includes status symbols
      expect(result).to.match(/●.*Enabled.*plugin-A/);  // Enabled symbol
      expect(result).to.match(/●.*Enabled.*plugin-B/);  // Enabled symbol
      expect(result).to.match(/●.*Enabled.*plugin-X/);  // Enabled symbol

      // Verify table headers
      expect(result).to.include('Status');
      expect(result).to.include('Name/Invoke Key');
    });
  });

  describe('Phase 5: Document Conversion Smoke Test', function() {
    it('4.1.5i: should convert document using added plugin (CI-friendly)', function() {
      const outputPath = path.join(os.tmpdir(), `test-plugin-output-${Date.now()}.pdf`);
      const convertCmd = `node cli.js convert "${testMarkdownFile}" --plugin plugin-A --output "${outputPath}" --open=false --coll-root "${testCollRoot}"`;

      const result = execSync(convertCmd, { encoding: 'utf8', cwd: process.cwd() });
      expect(result).to.include('PDF generated successfully') || expect(result).to.include('Conversion completed');

      // Verify output file was created
      expect(fs.existsSync(outputPath)).to.be.true;

      // Verify file has reasonable size (not empty)
      const stats = fs.statSync(outputPath);
      expect(stats.size).to.be.greaterThan(1000); // At least 1KB

      // Cleanup output file
      try { fs.unlinkSync(outputPath); } catch (e) {}
    });
  });

  describe('Phase 6: Plugin Removal Workflow', function() {
    it('4.1.5j: should remove user plugin and update unified manifest', function() {
      // Remove plugin-X
      const removeCmd = `node cli.js plugin remove plugin-X --coll-root "${testCollRoot}"`;
      const result = execSync(removeCmd, { encoding: 'utf8', cwd: process.cwd() });

      expect(result).to.include('Plugin \'plugin-X\' removed successfully');

      // Verify plugin directory is removed
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-X'))).to.be.false;

      // Verify manifest no longer contains plugin-X
      const manifestPath = path.join(testCollRoot, 'user-plugins', 'plugins.yaml');
      const manifest = fs.readFileSync(manifestPath, 'utf8');
      expect(manifest).to.not.include('plugin-X');
      expect(manifest).to.include('plugin-A');  // Other plugins remain
      expect(manifest).to.include('plugin-B');

      // Verify other plugins remain untouched
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-A'))).to.be.true;
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-B'))).to.be.true;
    });

    it('4.1.5k: should handle removal of non-existent plugin gracefully', function() {
      const removeCmd = `node cli.js plugin remove non-existent-plugin --coll-root "${testCollRoot}"`;

      try {
        execSync(removeCmd, { encoding: 'utf8', cwd: process.cwd() });
        throw new Error('Expected command to fail');
      } catch (error) {
        expect(error.status).to.equal(1);
        expect(error.stdout || error.stderr).to.include('Plugin \'non-existent-plugin\' not found');
      }
    });
  });

  describe('Phase 7: Architecture Integrity Verification', function() {
    it('4.1.5l: should maintain proper separation between collections and user-plugins', function() {
      // Verify collections directory only contains actual collections
      const collectionsDir = path.join(testCollRoot, 'collections');
      const collectionsContents = fs.readdirSync(collectionsDir);
      expect(collectionsContents).to.include('dummy-collection');
      expect(collectionsContents).to.include('dummy-singletons');
      expect(collectionsContents).to.not.include('user-plugins');

      // Verify user-plugins directory contains remaining plugins after removal
      const userPluginsDir = path.join(testCollRoot, 'user-plugins');
      const userPluginsContents = fs.readdirSync(userPluginsDir);
      expect(userPluginsContents).to.include('plugin-A');
      expect(userPluginsContents).to.include('plugin-B');
      expect(userPluginsContents).to.not.include('plugin-X');  // Should be removed
      expect(userPluginsContents).to.include('plugins.yaml');
    });

    it('4.1.5m: should handle collection operations without affecting user-plugins', function() {
      const updateCmd = `node cli.js collection update --coll-root "${testCollRoot}"`;
      const result = execSync(updateCmd, { encoding: 'utf8', cwd: process.cwd() });

      // Should update collections successfully without errors about user-plugins
      expect(result).to.include('Successfully re-synced collection from local source');
      expect(result).to.not.include('user-plugins');

      // Verify user-plugins directory remains intact after collection operations
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugins.yaml'))).to.be.true;
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-A'))).to.be.true;
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-B'))).to.be.true;
      expect(fs.existsSync(path.join(testCollRoot, 'user-plugins', 'plugin-X'))).to.be.false;  // Should remain removed
    });
  });
});
