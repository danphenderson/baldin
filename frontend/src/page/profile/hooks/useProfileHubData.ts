import { useMemo } from 'react';

import type { UserRead } from '../../../service/users';

export interface ProfileHubTheme {
  title: string;
  description: string;
}

export interface ProfileHubStoryBlock {
  title: string;
  organization: string;
  period: string;
  summary: string;
}

export interface ProfileHubAspirationPreviewItem {
  label: string;
  note: string;
}

export interface ProfileHubData {
  status: 'populated' | 'empty';
  hero: {
    title: string;
    statusLabel: string;
    summary: string;
    focusLabel: string;
    locationLabel: string;
    timeZoneLabel: string;
  };
  metrics: {
    roleCount: number;
    companyCount: number;
    signalCount: number;
    storyCount: number;
  };
  signalThemes: ProfileHubTheme[];
  storyBlocks: ProfileHubStoryBlock[];
  aspirationPreview: {
    guidance: string;
    roles: ProfileHubAspirationPreviewItem[];
    companies: ProfileHubAspirationPreviewItem[];
  };
}

const POPULATED_SIGNAL_THEMES: ProfileHubTheme[] = [
  {
    title: 'Systems-led product design',
    description: 'Position the profile around operating-system thinking, reusable design language, and product surfaces that scale cleanly.',
  },
  {
    title: 'Candidate journey fluency',
    description: 'Keep hiring-flow and application lifecycle work visible so later ranking and apply handoff stay grounded in real operating experience.',
  },
  {
    title: 'Frontend and accessibility partnership',
    description: 'Show the ability to translate design intent into implementation detail without losing readability, structure, or inclusive interaction quality.',
  },
];

const POPULATED_STORY_BLOCKS: ProfileHubStoryBlock[] = [
  {
    title: 'Staff Product Designer',
    organization: 'Northstar',
    period: '2022 → now',
    summary: 'Led a candidate-experience redesign that connected lead ranking, messaging, and apply handoff into one coherent operational surface.',
  },
  {
    title: 'Senior Product Designer',
    organization: 'Orchid Labs',
    period: '2019 → 2021',
    summary: 'Scaled marketplace and workflow patterns, pairing narrative product work with reusable systems and tighter frontend collaboration.',
  },
];

const POPULATED_ROLE_PREVIEW: ProfileHubAspirationPreviewItem[] = [
  {
    label: 'Staff Product Designer',
    note: 'Keeps the narrative centered on high-agency product ownership.',
  },
  {
    label: 'Design Systems Lead',
    note: 'Balances systems rigor with visible product impact.',
  },
  {
    label: 'Principal UX Engineer',
    note: 'Preserves the seam between design direction and implementation detail.',
  },
];

const POPULATED_COMPANY_PREVIEW: ProfileHubAspirationPreviewItem[] = [
  {
    label: 'Northstar',
    note: 'Collaborative product team with dense workflow complexity.',
  },
  {
    label: 'Harbor Health',
    note: 'Mission-driven environment with systems-heavy product needs.',
  },
  {
    label: 'Signal Health',
    note: 'Matches the healthcare-adjacent product and research themes in the current story.',
  },
];

const EMPTY_PROFILE_HUB_DATA: ProfileHubData = {
  status: 'empty',
  hero: {
    title: 'Profile & Aspirations Hub',
    statusLabel: 'Needs direction',
    summary: 'Set the direction Baldin should optimize toward. Start with a role focus and a short company list, then grow the supporting story blocks that later routes can reuse.',
    focusLabel: 'No direction selected',
    locationLabel: 'Location to be added',
    timeZoneLabel: 'Time zone to be added',
  },
  metrics: {
    roleCount: 0,
    companyCount: 0,
    signalCount: 0,
    storyCount: 0,
  },
  signalThemes: [],
  storyBlocks: [],
  aspirationPreview: {
    guidance: 'Roles and companies still live in their dedicated routes. This page keeps the handoff visible without coupling the redesign to a new backend summary contract yet.',
    roles: [],
    companies: [],
  },
};

function hasProfileSignal(user: UserRead | null): user is UserRead {
  if (!user) {
    return false;
  }

  return Boolean(
    user.first_name
    || user.last_name
    || user.city
    || user.state
    || user.country
    || user.phone_number,
  );
}

function buildDisplayName(user: UserRead): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || 'Profile & Aspirations Hub';
}

function buildLocationLabel(user: UserRead): string {
  const location = [user.city, user.state, user.country].filter(Boolean).join(', ');
  return location || 'Location to be added';
}

// Keep the hub model frontend-local until the redesign settles on a summary API shape.
export function useProfileHubData(user: UserRead | null): ProfileHubData {
  return useMemo(() => {
    if (!hasProfileSignal(user)) {
      return EMPTY_PROFILE_HUB_DATA;
    }

    return {
      status: 'populated',
      hero: {
        title: buildDisplayName(user),
        statusLabel: 'Direction set',
        summary: 'This hub keeps profile direction, aspiration previews, and reusable career proof points in one place before the rest of the flagship journey consumes them.',
        focusLabel: 'Leadership + systems focus',
        locationLabel: buildLocationLabel(user),
        timeZoneLabel: user.time_zone || 'Time zone to be added',
      },
      metrics: {
        roleCount: POPULATED_ROLE_PREVIEW.length,
        companyCount: POPULATED_COMPANY_PREVIEW.length,
        signalCount: POPULATED_SIGNAL_THEMES.length,
        storyCount: POPULATED_STORY_BLOCKS.length,
      },
      signalThemes: POPULATED_SIGNAL_THEMES,
      storyBlocks: POPULATED_STORY_BLOCKS,
      aspirationPreview: {
        guidance: 'Saved aspirations stay in their own routes, but this hub now keeps the roles-and-companies handoff visible in the flagship direction-setting surface.',
        roles: POPULATED_ROLE_PREVIEW,
        companies: POPULATED_COMPANY_PREVIEW,
      },
    };
  }, [user]);
}

export default useProfileHubData;
