// test/runners/integration/core/default-handler.manifest.js
require('module-alias/register');
const { defaultHandlerFactoryPath } = require('@paths');

const { makeDefaultHandlerScenario } = require(defaultHandlerFactoryPath);

const alwaysTestSlug = {
  'Test Doc': 'test-slug',
  test: 'test-slug',
  '': 'test-slug',
  undefined: 'test-slug',
};

module.exports = [
  makeDefaultHandlerScenario({
    description:
      '2.2.1: should successfully process a basic Markdown file and generate a PDF',
    markdownContent: '---\ntitle: Test Doc\n---\n# Hello World',
    stubs: {
      extractFrontMatter: {
        data: { title: 'Test Doc' },
        content: '# Hello World',
      },
      substituteAllPlaceholders: {
        processedFmData: { title: 'Test Doc' },
        processedContent: '# Hello World',
      },
      removeShortcodes: '# Hello World',
      ensureAndPreprocessHeading: '# Hello World',
      renderMarkdownToHtml: '<h1>Hello World</h1>',
      generateSlug: { ...alwaysTestSlug, 'Test Doc': 'test-doc' },
      expectations: (stubs, expect) => {
        expect(stubs.generatePdfStub.calledOnce).to.be.true;
        const [html, pdfPath] = stubs.generatePdfStub.getCall(0).args;
        expect(html).to.equal('<h1>Hello World</h1>');
        expect(pdfPath).to.equal('/output/test-doc.pdf');
      },
    },
    expectedResult: '/output/test-doc.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.2: should correctly remove shortcodes from Markdown content',
    markdownContent: 'Content with {{< shortcode >}}',
    pluginSpecificConfig: { remove_shortcodes_patterns: ['{{<.*?>}}'] },
    stubs: {
      extractFrontMatter: {
        data: {},
        content: 'Content with {{< shortcode >}}',
      },
      substituteAllPlaceholders: {
        processedFmData: {},
        processedContent: 'Content with {{< shortcode >}}',
      },
      removeShortcodes: 'Content with ',
      renderMarkdownToHtml: '<p>Content with </p>',
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        expect(
          stubs.removeShortcodesStub.calledWith(
            'Content with {{< shortcode >}}',
            ['{{<.*?>}}'],
          ),
        ).to.be.true;
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.3: should correctly substitute placeholders',
    markdownContent: 'Hello {{ .name }}!',
    globalConfig: { params: { name: 'World' } },
    stubs: {
      extractFrontMatter: { data: {}, content: 'Hello {{ .name }}!' },
      substituteAllPlaceholders: {
        processedFmData: { name: 'World' },
        processedContent: 'Hello World!',
      },
      removeShortcodes: 'Hello World!',
      renderMarkdownToHtml: '<p>Hello World!</p>',
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        expect(stubs.substituteAllPlaceholdersStub.calledOnce).to.be.true;
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.4: should apply markdown_it_options from plugin config to the MarkdownIt instance',
    pluginSpecificConfig: {
      markdown_it_options: { breaks: true, linkify: false },
    },
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const [, , , , , markdownItOptions] =
          stubs.renderMarkdownToHtmlStub.getCall(0).args;
        expect(markdownItOptions).to.deep.equal({
          breaks: true,
          linkify: false,
        });
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.5: should integrate math rendering by calling math_integration.getMathCssContent when configured',
    pluginSpecificConfig: { math: { enabled: true } },
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      getMathCssContent: ['/*math css*/'],
      expectations: (stubs, expect) => {
        expect(stubs.getMathCssContentStub.calledWith({ enabled: true })).to.be
          .true;
        const cssArray = stubs.generatePdfStub.getCall(0).args[3];
        expect(cssArray).to.deep.equal(['/*math css*/']);
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.6: should correctly apply markdown-it-anchor and markdown-it-table-of-contents options',
    pluginSpecificConfig: {
      toc_options: { enabled: true, level: [1, 2] },
      pdf_options: { anchor_options: { permalink: true } },
    },
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const [, tocOptions, anchorOptions] =
          stubs.renderMarkdownToHtmlStub.getCall(0).args;
        expect(tocOptions).to.deep.equal({ enabled: true, level: [1, 2] });
        expect(anchorOptions).to.deep.equal({ permalink: true });
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.7: should correctly integrate custom MarkdownIt plugins',
    markdownContent: 'Some content.',
    pluginSpecificConfig: { markdown_it_plugins: ['markdown-it-footnote'] },
    stubs: {
      renderMarkdownToHtml: '<p>Some content.</p>',
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const [, , , , , , customPlugins] =
          stubs.renderMarkdownToHtmlStub.getCall(0).args;
        expect(customPlugins).to.deep.equal(['markdown-it-footnote']);
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.8: should resolve and merge CSS files',
    markdownContent: 'CSS test.',
    pluginSpecificConfig: { css_files: ['style.css'] },
    pluginBasePath: '/plugins/my-plugin',
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, _expect) => {
        stubs.existsSyncStub
          .withArgs('/plugins/my-plugin/style.css')
          .returns(true);
        stubs.readFileStub
          .withArgs('/plugins/my-plugin/style.css', 'utf8')
          .resolves('body { color: red; }');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.9: should load and pass custom HTML template content to pdf_generator',
    markdownContent: '---\ntitle: Template Test\n---\nContent',
    pluginSpecificConfig: { html_template_path: 'my-template.html' },
    pluginBasePath: '/plugins/my-plugin',
    stubs: {
      extractFrontMatter: {
        data: { title: 'Template Test' },
        content: 'Content',
      },
      substituteAllPlaceholders: {
        processedFmData: { title: 'Template Test' },
        processedContent: 'Content',
      },
      removeShortcodes: 'Content',
      ensureAndPreprocessHeading: '# Template Test\n\nContent',
      renderMarkdownToHtml: '<p>Content</p>',
      generateSlug: { 'Template Test': 'template-test' },
      fileMocks: [
        {
          path: '/plugins/my-plugin/my-template.html',
          content: '<html>{{{body}}}</html>',
        },
      ],
      expectations: (stubs, expect) => {
        const templateContent = '<html>{{{body}}}</html>';
        expect(stubs.generatePdfStub.calledOnce).to.be.true;
        const [, , , , htmlTemplate] = stubs.generatePdfStub.getCall(0).args;
        expect(htmlTemplate).to.equal(templateContent);
      },
    },
    expectedResult: '/output/template-test.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.9: should proceed without a template if html_template_path is not provided',
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        expect(stubs.generatePdfStub.calledOnce).to.be.true;
        const [, , , , htmlTemplate] = stubs.generatePdfStub.getCall(0).args;
        expect(htmlTemplate).to.be.null;
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.10: should pass HTML injection snippets',
    markdownContent: 'Injection test.',
    pluginSpecificConfig: {
      head_html: '<meta>',
      body_html_start: '<header>',
      body_html_end: '<footer>',
    },
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        expect(stubs.generatePdfStub.calledOnce).to.be.true;
        const [, , , , , injectionPoints] =
          stubs.generatePdfStub.getCall(0).args;
        expect(injectionPoints.head_html).to.equal('<meta>');
        expect(injectionPoints.body_html_start).to.equal('<header>');
        expect(injectionPoints.body_html_end).to.equal('<footer>');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.10: should pass empty strings for unspecified HTML injection snippets',
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const injectionPoints = stubs.generatePdfStub.getCall(0).args[5];
        expect(injectionPoints.head_html).to.equal('');
        expect(injectionPoints.body_html_start).to.equal('');
        expect(injectionPoints.body_html_end).to.equal('');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.11: should determine output filename from front matter',
    markdownContent: '---\ntitle: My Doc\nauthor: Me\n---\nContent',
    stubs: {
      extractFrontMatter: {
        data: { title: 'My Doc', author: 'Me' },
        content: 'Content',
      },
      substituteAllPlaceholders: {
        processedFmData: { title: 'My Doc', author: 'Me' },
        processedContent: 'Content',
      },
      generateSlug: { 'My Doc': 'my-doc', Me: 'me' },
      expectations: (stubs, expect) => {
        const pdfPath = stubs.generatePdfStub.getCall(0).args[1];
        expect(pdfPath).to.equal('/output/my-doc-me.pdf');
      },
    },
    expectedResult: '/output/my-doc-me.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.13: should call generatePdf with prepared content',
    markdownContent: 'Final call test',
    stubs: {
      renderMarkdownToHtml: '<p>Final call test</p>',
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        expect(stubs.generatePdfStub.calledOnce).to.be.true;
        const [html] = stubs.generatePdfStub.getCall(0).args;
        expect(html).to.equal('<p>Final call test</p>');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.14: should pass lang attribute from front matter',
    markdownContent: '---\nlang: fr\n---\nBonjour',
    stubs: {
      extractFrontMatter: { data: { lang: 'fr' }, content: 'Bonjour' },
      substituteAllPlaceholders: {
        processedFmData: { lang: 'fr' },
        processedContent: 'Bonjour',
      },
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const injectionPoints = stubs.generatePdfStub.getCall(0).args[5];
        expect(injectionPoints.lang).to.equal('fr');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.14: should default to "en" if lang is not specified in front matter',
    stubs: {
      generateSlug: { ...alwaysTestSlug },
      expectations: (stubs, expect) => {
        const injectionPoints = stubs.generatePdfStub.getCall(0).args[5];
        expect(injectionPoints.lang).to.equal('en');
      },
    },
    expectedResult: '/output/test-slug.pdf',
  }),

  makeDefaultHandlerScenario({
    description: '2.2.15: should NOT inject H1 if omit_title_heading is true',
    pluginSpecificConfig: {
      inject_fm_title_as_h1: true,
      omit_title_heading: true,
    },
    markdownContent: '---\ntitle: My Title\n---',
    stubs: {
      extractFrontMatter: { data: { title: 'My Title' }, content: '' },
      substituteAllPlaceholders: {
        processedFmData: { title: 'My Title' },
        processedContent: '',
      },
      generateSlug: { ...alwaysTestSlug, 'My Title': 'my-title' },
      expectations: (stubs, expect) => {
        expect(stubs.ensureAndPreprocessHeadingStub.notCalled).to.be.true;
      },
    },
    expectedResult: '/output/my-title.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.15: should inject H1 title if omit_title_heading is false or undefined',
    pluginSpecificConfig: {
      inject_fm_title_as_h1: true,
      omit_title_heading: false,
    },
    markdownContent: '---\ntitle: My Title\n---',
    stubs: {
      extractFrontMatter: { data: { title: 'My Title' }, content: '' },
      substituteAllPlaceholders: {
        processedFmData: { title: 'My Title' },
        processedContent: '',
      },
      generateSlug: { ...alwaysTestSlug, 'My Title': 'my-title' },
      expectations: (stubs, expect) => {
        expect(stubs.ensureAndPreprocessHeadingStub.called).to.be.true;
      },
    },
    expectedResult: '/output/my-title.pdf',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.12: should gracefully handle errors during Markdown file reading',
    stubs: {
      existsSync: false,
    },
    expectedError: 'Input Markdown file not found',
    expectedLogs: [
      {
        level: 'error',
        msg: 'Document generation failed',
        data: {
          context: 'DefaultHandler',
          error: 'Input Markdown file not found: /path/to/test.md',
          operation: 'document generation',
          file: '/path/to/test.md',
        },
      },
      {
        level: 'error',
        msg: 'Document generation failed',
        data: {
          context: 'DefaultHandler',
          error: 'Input Markdown file not found: /path/to/test.md',
          operation: 'document generation',
          file: '/path/to/test.md',
        },
      },
    ],
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.16.1: should return null and log an error if fs.readFile fails',
    markdownContent: 'any',
    stubs: {
      readFileThrows: true,
      generateSlug: { ...alwaysTestSlug },
    },
    expectedError: 'Mock file read error',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.16.2: should return null and log an error if renderMarkdownToHtml fails',
    markdownContent: 'any',
    stubs: {
      renderMarkdownToHtmlThrows: true,
      generateSlug: { ...alwaysTestSlug },
    },
    expectedError: 'Mock render error',
  }),

  makeDefaultHandlerScenario({
    description:
      '2.2.16.3: should return null and log an error if generatePdf fails',
    markdownContent: 'any',
    stubs: {
      generatePdfThrows: true,
      generateSlug: { ...alwaysTestSlug },
    },
    expectedError: 'Mock PDF generation error',
  }),
];
