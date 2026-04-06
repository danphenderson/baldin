import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Baldin',
  tagline: 'Developer-preview, local-first job-search automation workspace',
  favicon: 'img/favicon.ico',

  url: 'https://danphenderson.github.io',
  baseUrl: '/baldin/',

  organizationName: 'danphenderson',
  projectName: 'baldin',

  onBrokenLinks: 'throw',

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

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/danphenderson/baldin/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Baldin',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/danphenderson/baldin',
          label: 'GitHub',
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
            {label: 'Start Here', to: '/getting-started/overview'},
            {label: 'Explore Features', to: '/features/command-center'},
            {label: 'Understand The System', to: '/architecture/system-overview'},
            {label: 'Build, Validate, Release', to: '/engineering/local-development'},
          ],
        },
        {
          title: 'Look Up Details',
          items: [
            {label: 'API Reference', to: '/reference/api-reference'},
            {label: 'Documentation Resources', to: '/reference/resources'},
            {label: 'Environment Variables', to: '/reference/environment-variables'},
            {label: 'Glossary', to: '/reference/glossary'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/danphenderson/baldin'},
            {label: 'Issues', href: 'https://github.com/danphenderson/baldin/issues'},
            {label: 'Pull Requests', href: 'https://github.com/danphenderson/baldin/pulls'},
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
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
