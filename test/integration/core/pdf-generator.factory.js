// test/integration/core/pdf-generator.factory.js

function makePdfGeneratorScenario({
  description,
  stubs = {},
  assertion,
  constants,
}) {
  const setup = (mocks, constantsArg) => {
    const { mockPuppeteer } = mocks;

    // Apply scenario-specific stub behaviors
    if (stubs.launchRejects) {
      mockPuppeteer.launch.rejects(new Error(stubs.launchRejects));
    }
    if (stubs.setContentRejects) {
      mockPuppeteer.mockPage.setContent.rejects(new Error(stubs.setContentRejects));
    }
    if (stubs.pdfRejects) {
      mockPuppeteer.mockPage.pdf.rejects(new Error(stubs.pdfRejects));
    }
  };

  const assert = async (result, mocks, constantsArg, expect, logs) => {
    if (assertion) {
      await assertion(result, mocks, constantsArg, expect, logs);
    }
  };

  return { description, setup, assert, constants };
}

module.exports = { makePdfGeneratorScenario };

