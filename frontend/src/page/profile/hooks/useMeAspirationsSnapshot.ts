import { useCallback, useEffect, useState } from 'react';
import { getAspirations, type AspirationItem } from '../../../service/aspirations';

export interface MeAspirationsSnapshot {
  roles: AspirationItem[];
  companies: AspirationItem[];
}

export interface MeAspirationsSnapshotSource {
  load: () => Promise<MeAspirationsSnapshot>;
}

export interface UseMeAspirationsSnapshotReturn {
  loading: boolean;
  error: string;
  data: MeAspirationsSnapshot;
  refresh: () => Promise<void>;
}

const EMPTY_SNAPSHOT: MeAspirationsSnapshot = {
  roles: [],
  companies: [],
};

export function createApiMeAspirationsSnapshotSource(token: string): MeAspirationsSnapshotSource {
  return {
    async load() {
      const [roles, companies] = await Promise.all([
        getAspirations(token, 'role'),
        getAspirations(token, 'company'),
      ]);

      return { roles, companies };
    },
  };
}

export function useMeAspirationsSnapshot(
  source: MeAspirationsSnapshotSource | null,
): UseMeAspirationsSnapshotReturn {
  const [loading, setLoading] = useState(Boolean(source));
  const [error, setError] = useState('');
  const [data, setData] = useState<MeAspirationsSnapshot>(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    if (!source) {
      setLoading(false);
      setError('');
      setData(EMPTY_SNAPSHOT);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const next = await source.load();
      setData(next);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load aspirations');
      setData(EMPTY_SNAPSHOT);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    data,
    refresh,
  };
}
