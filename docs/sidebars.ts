import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Start Here',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/quickstart',
        'getting-started/contributing',
        'getting-started/deployment-guide',
      ],
    },
    {
      type: 'category',
      label: 'Explore Features',
      items: [
        'features/dashboard',
        'features/job-search-pipeline',
        'features/document-workspace',
        'features/extraction-and-automation',
        'features/networking',
      ],
    },
    {
      type: 'category',
      label: 'Understand The System',
      items: [
        'architecture/system-overview',
        'architecture/data-model',
        'architecture/api-surface',
        'architecture/frontend-architecture',
        'architecture/extraction-pipeline',
        'architecture/document-collaboration',
        'architecture/networking-and-messaging',
        'architecture/aspirations-to-apply',
      ],
    },
    {
      type: 'category',
      label: 'Frontend UI System',
      items: [
        'architecture/frontend-design-system',
        'reference/design-system-catalog',
        'reference/baldin-app-screens-inventory',
        'reference/baldin-library-buildout-ledger',
        'engineering/design-system-governance',
        'engineering/design-system-workflow',
        'engineering/design-system-migration-guide',
        'engineering/phase-2-design-system-closeout',
      ],
    },
    {
      type: 'category',
      label: 'Build, Validate, Release',
      items: [
        'engineering/local-development',
        'engineering/ci-pipeline',
        'engineering/contract-management',
        'engineering/copilot-prompt-cookbook',
        'engineering/copilot-prompt-examples',
        'engineering/testing',
        'engineering/release-roadmap',
      ],
    },
    {
      type: 'category',
      label: 'Look Up Details',
      items: [
        'reference/api-reference',
        'reference/resources',
        'reference/environment-variables',
        'reference/glossary',
      ],
    },
  ],
};

export default sidebars;
