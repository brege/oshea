// test/test-constants.js
const path = require('path');

const TEST_DIR = __dirname; 
const PROJECT_ROOT = path.join(TEST_DIR, '..', '..');
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'config.test.yaml');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');
const CLI_SCRIPT_PATH = path.join(PROJECT_ROOT, 'cli.js');

const TEST_OUTPUT_DIR_NAME = 'test_output'; 
const TEST_OUTPUT_BASE_DIR = path.join(TEST_DIR, TEST_OUTPUT_DIR_NAME); 

const HUGO_EXAMPLE_SOURCE_IN_EXAMPLES = path.join(EXAMPLES_DIR, 'hugo-example'); 

const CREATED_PLUGINS_SUBDIR = 'created_plugins_test'; 
const CREATED_PLUGINS_DIR = path.join(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_SUBDIR); 

const FM_CV_SPEC_MD_PATH = path.join(TEST_DIR, 'assets', 'front_matter_tests', 'fm_specifies_cv.md');
const LOCAL_CONFIG_DOC_MD_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'doc_with_local_config.md');
const LOCAL_CONFIG_DOC_YAML_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'doc_with_local_config.config.yaml'); 
const LOCAL_CONFIG_DOC_CSS_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'local_test_style.css'); 

module.exports = {
    TEST_DIR,
    PROJECT_ROOT,
    TEST_CONFIG_PATH,
    EXAMPLES_DIR,
    CLI_SCRIPT_PATH,
    TEST_OUTPUT_DIR_NAME,
    TEST_OUTPUT_BASE_DIR,
    HUGO_EXAMPLE_SOURCE_IN_EXAMPLES,
    CREATED_PLUGINS_SUBDIR,
    CREATED_PLUGINS_DIR,
    FM_CV_SPEC_MD_PATH,
    LOCAL_CONFIG_DOC_MD_PATH,
    LOCAL_CONFIG_DOC_YAML_PATH,
    LOCAL_CONFIG_DOC_CSS_PATH,
};
