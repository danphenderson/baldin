import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/quickstart',
        'getting-started/contributing',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/system-overview',
        'architecture/data-model',
        'architecture/api-surface',
        'architecture/extraction-pipeline',
        'architecture/frontend-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Engineering',
      items: [
        'engineering/local-development',
        'engineering/ci-pipeline',
        'engineering/contract-management',
        'engineering/copilot-prompt-cookbook',
        'engineering/copilot-prompt-examples',
        'engineering/testing',
        'engineering/deployment-status',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/api-reference',
        'reference/environment-variables',
        'reference/project-status',
      ],
    },
  ],
};

export default sidebars;
