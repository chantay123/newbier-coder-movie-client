import { useState, useEffect } from 'react';
import { YearEntity } from '@/features/admin/years/types/year.types';
import {
  IYearClientService,
  yearClientService as defaultClientService,
} from '@/features/client/years/services/yearClientService';

export interface UseClientYearsOptions {
  service?: IYearClientService;
}

export interface UseClientYearsReturn {
  activeYears: YearEntity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClientYears({
  service = defaultClientService,
}: UseClientYearsOptions = {}): UseClientYearsReturn {
  const [activeYears, setActiveYears] = useState<YearEntity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadYears = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const years = await service.getActiveYears(signal);
      // Extra safety check: ensure all returned items have isActive !== false
      const filtered = years.filter((y) => y.isActive !== false);
      setActiveYears(filtered);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách năm phát hành';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadYears(controller.signal);

    return () => {
      controller.abort();
    };
  }, [service]);

  return {
    activeYears,
    isLoading,
    error,
    refresh: () => loadYears(),
  };
}
