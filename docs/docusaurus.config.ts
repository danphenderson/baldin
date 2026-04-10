import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Baldin',
  tagline: 'AI-Powered Employment Autopilot',
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

  themes: ['@docusaurus/theme-mermaid'],

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
          {from: '/engineering/copilot-prompt-cookbook', to: '/docs/engineering/copilot-prompt-cookbook'},
          {from: '/engineering/copilot-prompt-examples', to: '/docs/engineering/copilot-prompt-examples'},
          {from: '/engineering/testing', to: '/docs/engineering/testing'},
          {from: '/engineering/release-roadmap', to: '/docs/engineering/release-roadmap'},
          {from: '/reference/api-reference', to: '/docs/reference/api-reference'},
          {from: '/reference/resources', to: '/docs/reference/resources'},
          {from: '/reference/environment-variables', to: '/docs/reference/environment-variables'},
          {from: '/reference/glossary', to: '/docs/reference/glossary'},
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
      {name: 'description', content: 'Baldin is a local-first, developer-preview job-search automation workspace. Track applications, extract leads, collaborate on documents, and manage your search through a private engineering workflow.'},
      {name: 'keywords', content: 'job search automation, employment autopilot, job tracking, AI job search, local-first, developer preview, private repo, career tools, application tracker'},
      {property: 'og:title', content: 'Baldin — AI-Powered Employment Autopilot'},
      {property: 'og:description', content: 'Take control of your job search with a local-first developer preview for applications, leads, documents, and networking.'},
    ],
    announcementBar: {
      id: 'developer_preview',
      content: '🚀 Baldin is in <b>developer preview</b> — <a href="http://localhost:3001/baldin/docs/getting-started/quickstart">try it locally</a> with Docker Compose',
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
