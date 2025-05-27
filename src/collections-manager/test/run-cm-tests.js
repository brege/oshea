// dev/src/collections-manager/test/run-cm-tests.js
const assert = require('assert');
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process'); // Using spawnSync for CLI tests
const CollectionsManager = require('../index.js');

const TEST_COLL_ROOT_BASE = path.join(os.tmpdir(), 'cm_test_coll_root');
let testCounter = 0;
let testsPassed = 0;

// Helper function to create a unique temp directory for each test run
async function createTestCollRoot() {
    testCounter++;
    const uniqueTestCollRoot = path.join(TEST_COLL_ROOT_BASE, `run_${testCounter}`);
    await fs.mkdir(uniqueTestCollRoot, { recursive: true });
    return uniqueTestCollRoot;
}

async function cleanupTestCollRoot(collRootPath) {
    if (fss.existsSync(collRootPath)) {
        await fs.rm(collRootPath, { recursive: true, force: true });
    }
}

function runCliCommand(argsArray, cwd = process.cwd()) {
    const result = spawnSync('node', [path.resolve(__dirname, '../collections-manager-cli.js'), ...argsArray], {
        cwd,
        encoding: 'utf-8',
        stdio: 'pipe' // Capture stdio
    });

    if (result.error) {
        console.error(`CLI Command Error: ${result.error}`);
    }
    // if (result.stderr) { // Yargs often puts help output to stderr
    //     console.error(`CLI Command STDERR:\n${result.stderr}`);
    // }
    return {
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        error: result.error
    };
}


async function testAddCollectionGit() {
    console.log("\nRunning test: Add Collection from Git URL...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot });
    const testRepoUrl = 'https://github.com/brege/md-to-pdf-plugins.git'; // Use the actual repo
    const collectionName = 'brege-plugins-git-test';

    try {
        const resultPath = await manager.addCollection(testRepoUrl, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), 'Correct path should be returned');
        assert.ok(fss.existsSync(resultPath), 'Collection directory should exist');
        // Check for a known file from the repo
        assert.ok(fss.existsSync(path.join(resultPath, 'README.md')), 'README.md should exist in cloned repo');
        console.log("  PASSED: Add Collection from Git URL");
        testsPassed++;
    } catch (error) {
        console.error("  FAILED: Add Collection from Git URL", error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
    }
}

async function testAddCollectionLocal() {
    console.log("\nRunning test: Add Collection from Local Path...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot });

    // Create a dummy local source directory
    const localSourcePath = path.join(os.tmpdir(), 'cm_local_source_test');
    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'test-plugin.config.yaml'), 'description: A local test plugin.');
    await fs.mkdir(path.join(localSourcePath, 'another-plugin'), { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'another-plugin', 'config.yaml'), 'description: Another one.');


    const collectionName = 'local-collection-test';

    try {
        const resultPath = await manager.addCollection(localSourcePath, { name: collectionName });
        assert.strictEqual(resultPath, path.join(testCollRoot, collectionName), 'Correct path should be returned for local add');
        assert.ok(fss.existsSync(resultPath), 'Local collection directory should exist');
        assert.ok(fss.existsSync(path.join(resultPath, 'test-plugin.config.yaml')), 'Copied file should exist');
        assert.ok(fss.existsSync(path.join(resultPath, 'another-plugin', 'config.yaml')), 'Copied subdirectory file should exist');
        console.log("  PASSED: Add Collection from Local Path");
        testsPassed++;
    } catch (error) {
        console.error("  FAILED: Add Collection from Local Path", error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await fs.rm(localSourcePath, { recursive: true, force: true }); // Clean up dummy local source
    }
}

async function testListCollections() {
    console.log("\nRunning test: List Collections...");
    const testCollRoot = await createTestCollRoot();
    const manager = new CollectionsManager({ collRoot: testCollRoot });

    // Add a couple of collections
    await manager.addCollection('https://github.com/brege/md-to-pdf-plugins.git', { name: 'plugins1' });
    const localSourcePath = path.join(os.tmpdir(), 'cm_local_source_list_test');
    await fs.mkdir(localSourcePath, { recursive: true });
    await fs.writeFile(path.join(localSourcePath, 'dummy.txt'), 'hello');
    await manager.addCollection(localSourcePath, { name: 'plugins2' });


    try {
        const collections = await manager.listCollections();
        assert.ok(collections.includes('plugins1'), 'List should include plugins1');
        assert.ok(collections.includes('plugins2'), 'List should include plugins2');
        assert.strictEqual(collections.length, 2, 'Should list correct number of collections');
        console.log("  PASSED: List Collections");
        testsPassed++;
    } catch (error) {
        console.error("  FAILED: List Collections", error);
    } finally {
        await cleanupTestCollRoot(testCollRoot);
        await fs.rm(localSourcePath, { recursive: true, force: true });
    }
}

async function testCliAddAndList() {
    console.log("\nRunning test: CLI Add and List...");
    const testCollRoot = await createTestCollRoot(); // CLI will use its default, but we need a clean space if it's this one
    const originalCollRootEnv = process.env.XDG_DATA_HOME;
    // Override XDG_DATA_HOME to point our CLI's default COLL_ROOT to our test area
    process.env.XDG_DATA_HOME = path.dirname(testCollRoot); // So COLL_ROOT becomes testCollRoot/md-to-pdf/collections

    const collManDir = path.basename(testCollRoot); // e.g. run_X
    const expectedFinalCollRoot = path.join(testCollRoot, 'md-to-pdf', 'collections');


    try {
        // Test CLI add
        const addResult = runCliCommand(['add', 'https://github.com/brege/md-to-pdf-plugins.git', '--name', 'cli-added-repo']);
        assert.strictEqual(addResult.status, 0, `CLI add command should exit with 0, stdout: ${addResult.stdout}, stderr: ${addResult.stderr}`);
        assert.ok(addResult.stdout.includes("Collection 'cli-added-repo' added to:"), `CLI add stdout incorrect: ${addResult.stdout}`);
        assert.ok(fss.existsSync(path.join(expectedFinalCollRoot, 'cli-added-repo', 'README.md')), 'README.md from CLI added repo should exist');

        // Test CLI list
        const listResult = runCliCommand(['list']);
        assert.strictEqual(listResult.status, 0, `CLI list command should exit with 0, stdout: ${listResult.stdout}, stderr: ${listResult.stderr}`);
        assert.ok(listResult.stdout.includes('cli-added-repo'), 'CLI list should show the added repo');
        console.log("  PASSED: CLI Add and List");
        testsPassed++;

    } catch (error) {
        console.error("  FAILED: CLI Add and List", error);
    } finally {
        // Restore original env var and cleanup
        if (originalCollRootEnv) {
            process.env.XDG_DATA_HOME = originalCollRootEnv;
        } else {
            delete process.env.XDG_DATA_HOME;
        }
        // Cleanup the specific base dir we created for this test run's COLL_ROOT
        await cleanupTestCollRoot(path.dirname(testCollRoot));
    }
}


async function runAllTests() {
    console.log("Starting Collections Manager Tests...");
    const overallTestCollRootBase = path.join(os.tmpdir(), 'cm_overall_test_coll_root');
    await fs.mkdir(overallTestCollRootBase, { recursive: true }); // Main base for all test runs if needed

    await testAddCollectionGit();
    await testAddCollectionLocal();
    await testListCollections();
    // await testCliAddAndList(); // CLI test needs careful COLL_ROOT handling

    console.log(`\n--- Test Summary ---`);
    console.log(`Total tests run: ${testCounter}`); // testCounter is not fully representative here, let's use a manual count or sum
    const totalPlanned = 3; // Manually set for now
    console.log(`Tests attempted: ${totalPlanned}`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${totalPlanned - testsPassed}`);

    await fs.rm(overallTestCollRootBase, { recursive: true, force: true }); // Cleanup main base

    if (testsPassed === totalPlanned) {
        console.log("\nAll Collections Manager tests passed! ✅");
        process.exit(0);
    } else {
        console.error("\nSome Collections Manager tests failed. ❌");
        process.exit(1);
    }
}

runAllTests();
