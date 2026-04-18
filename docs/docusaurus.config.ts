import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Baldin',
  tagline: 'Local-First Job Search OS',
  favicon: 'img/favicon.svg',

  url: 'https://danphenderson.github.io',
  baseUrl: '/baldin/',

  organizationName: 'danphenderson',
  projectName: 'baldin',

  onBrokenLinks: 'throw',

  headTags: [
    {
      tagName: 'meta',
      attributes: {property: 'og:image', content: 'https://danphenderson.github.io/baldin/img/og-image.svg'},
    },
    {
      tagName: 'meta',
      attributes: {property: 'og:type', content: 'website'},
    },
    {
      tagName: 'meta',
      attributes: {name: 'twitter:card', content: 'summary_large_image'},
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/docs',
        explicitSearchResultPath: true,
        searchResultLimits: 10,
        searchBarPosition: 'right',
        searchBarShortcut: false,
        searchBarShortcutHint: false,
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          // Preserve old root-served doc paths after moving routeBasePath to /docs
          {from: '/getting-started/overview', to: '/docs/getting-started/overview'},
          {from: '/getting-started/quickstart', to: '/docs/getting-started/quickstart'},
          {from: '/getting-started/contributing', to: '/docs/getting-started/contributing'},
          {from: '/getting-started/deployment-guide', to: '/docs/getting-started/deployment-guide'},
          {from: '/features/command-center', to: '/docs/features/dashboard'},
          {from: '/features/dashboard', to: '/docs/features/dashboard'},
          {from: '/features/job-search-pipeline', to: '/docs/features/job-search-pipeline'},
          {from: '/features/document-workspace', to: '/docs/features/document-workspace'},
          {from: '/features/extraction-and-automation', to: '/docs/features/extraction-and-automation'},
          {from: '/features/networking', to: '/docs/features/networking'},
          {from: '/architecture/system-overview', to: '/docs/architecture/system-overview'},
          {from: '/architecture/data-model', to: '/docs/architecture/data-model'},
          {from: '/architecture/api-surface', to: '/docs/architecture/api-surface'},
          {from: '/architecture/frontend-architecture', to: '/docs/architecture/frontend-architecture'},
          {from: '/architecture/extraction-pipeline', to: '/docs/architecture/extraction-pipeline'},
          {from: '/architecture/document-collaboration', to: '/docs/architecture/document-collaboration'},
          {from: '/architecture/networking-and-messaging', to: '/docs/architecture/networking-and-messaging'},
          {from: '/engineering/local-development', to: '/docs/engineering/local-development'},
          {from: '/engineering/ci-pipeline', to: '/docs/engineering/ci-pipeline'},
          {from: '/engineering/contract-management', to: '/docs/engineering/contract-management'},
          {from: '/engineering/design-system-catalog', to: '/docs/reference/design-system-catalog'},
          {from: '/engineering/deployment-status', to: '/docs/engineering/release-roadmap'},
          {from: '/engineering/agentic-workflow-cookbook', to: '/docs/engineering/agentic-workflow-cookbook'},
          {from: '/engineering/agentic-prompt-examples', to: '/docs/engineering/agentic-prompt-examples'},
          {from: '/engineering/copilot-prompt-cookbook', to: '/docs/engineering/agentic-workflow-cookbook'},
          {from: '/engineering/copilot-prompt-examples', to: '/docs/engineering/agentic-prompt-examples'},
          {from: '/docs/engineering/copilot-prompt-cookbook', to: '/docs/engineering/agentic-workflow-cookbook'},
          {from: '/docs/engineering/copilot-prompt-examples', to: '/docs/engineering/agentic-prompt-examples'},
          {from: '/docs/engineering/design-system-catalog', to: '/docs/reference/design-system-catalog'},
          {from: '/docs/engineering/deployment-status', to: '/docs/engineering/release-roadmap'},
          {from: '/engineering/testing', to: '/docs/engineering/testing'},
          {from: '/engineering/release-roadmap', to: '/docs/engineering/release-roadmap'},
          {from: '/reference/api-reference', to: '/docs/reference/api-reference'},
          {from: '/reference/resources', to: '/docs/reference/resources'},
          {from: '/reference/environment-variables', to: '/docs/reference/environment-variables'},
          {from: '/reference/glossary', to: '/docs/reference/glossary'},
          {from: '/reference/project-status', to: '/docs/engineering/release-roadmap'},
          {from: '/docs/reference/project-status', to: '/docs/engineering/release-roadmap'},
        ],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-image.svg',
    metadata: [
      {name: 'description', content: 'Baldin is a private, local-first job-search workspace today. Track applications, extract leads, collaborate on documents, and work from repo-local contributor workflows while the target direction evolves toward applicant-side labor market observability.'},
      {name: 'keywords', content: 'local-first job search, job search os, application tracker, career control plane, listing observability, private workflow, contributor docs, docker compose'},
      {property: 'og:title', content: 'Baldin — Local-First Job Search OS'},
      {property: 'og:description', content: 'Private, local-first job-search workspace today; applicant-side labor market observability is the target direction.'},
    ],
    announcementBar: {
      id: 'developer_preview',
      content: 'Baldin is <b>local-first today</b> — <a href="/baldin/docs/getting-started/quickstart">boot the Docker Compose stack</a>',
      backgroundColor: '#0e7490',
      textColor: '#f1f5f9',
      isCloseable: true,
    },
    navbar: {
      title: 'Baldin',
      logo: {
        alt: 'Baldin',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/engineering/release-roadmap',
          label: 'Release Readiness',
          position: 'right',
        },
        {
          type: 'search',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Start Here Next',
          items: [
            {label: 'Start Here', to: '/docs/getting-started/overview'},
            {label: 'Explore Features', to: '/docs/features/dashboard'},
            {label: 'Understand The System', to: '/docs/architecture/system-overview'},
            {label: 'Build, Validate, Release', to: '/docs/engineering/local-development'},
          ],
        },
        {
          title: 'Look Up Details',
          items: [
            {label: 'API Reference', to: '/docs/reference/api-reference'},
            {label: 'Documentation Resources', to: '/docs/reference/resources'},
            {label: 'Environment Variables', to: '/docs/reference/environment-variables'},
            {label: 'Glossary', to: '/docs/reference/glossary'},
          ],
        },
        {
          title: 'Current Posture',
          items: [
            {label: 'Developer Preview', to: '/docs/getting-started/overview'},
            {label: 'Release Readiness', to: '/docs/engineering/release-roadmap'},
            {label: 'Contribute Safely', to: '/docs/getting-started/contributing'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Daniel P. Henderson. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'json', 'yaml', 'toml'],
    },
    mermaid: {
      theme: {light: 'default', dark: 'dark'},
      options: {
        er: {useMaxWidth: true},
        flowchart: {useMaxWidth: true},
        sequence: {useMaxWidth: true},
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
