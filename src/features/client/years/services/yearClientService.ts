/**
 * @file yearClientService.ts
 * @description Client-facing Release Year service.
 * Fetches and caches publicly accessible release years, guaranteeing that any inactive
 * years (isActive: false) are filtered out and never displayed in client navigation or filters.
 */

import axios from 'axios';
import { YearEntity } from '@/features/admin/years/types/year.types';
import { extractYearList } from '@/features/admin/years/services/yearAdminService';
import { INITIAL_YEARS } from '@/mock/admin/mockTaxonomies';

export interface IYearClientService {
  getActiveYears(signal?: AbortSignal): Promise<YearEntity[]>;
}

export class YearClientService implements IYearClientService {
  private cachedActiveYears: YearEntity[] | null = null;
  private inFlightPromise: Promise<YearEntity[]> | null = null;
  private readonly apiUrl: string;

  constructor(apiUrl?: string) {
    const rawUrl =
      apiUrl ||
      process.env.NEXT_PUBLIC_CORE_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://core-movie-service.onrender.com/api/v1';
    this.apiUrl = rawUrl.replace(/\/+$/, '');
  }

  /**
   * Retrieves all active release years for client navigation and filtering.
   * Strips all inactive years (isActive: false) to comply with business rules.
   *
   * @param signal Optional AbortSignal
   * @returns Array of active YearEntity objects sorted chronologically descending
   */
  async getActiveYears(signal?: AbortSignal): Promise<YearEntity[]> {
    if (this.cachedActiveYears && this.cachedActiveYears.length > 0) {
      return this.cachedActiveYears;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = (async () => {
      let candidateYears: YearEntity[] = [];

      try {
        const response = await axios.get(`${this.apiUrl}/years`, {
          signal,
          headers: {
            Accept: 'application/json',
          },
          timeout: 8000,
        });

        candidateYears = extractYearList(response.data);
      } catch {
        // Fallback to initial mock taxonomies when network/offline
        candidateYears = (INITIAL_YEARS || []).map((y) => ({
          id: String(y.id || y.slug),
          name: String(y.name || y.slug),
          slug: String(y.slug),
          description: y.description || '',
          isActive: y.isActive !== undefined ? Boolean(y.isActive) : true,
          movieCount: typeof y.movieCount === 'number' ? y.movieCount : 0,
        }));
      }

      // CRITICAL BUSINESS RULE:
      // Filter out any release year where isActive is false.
      // Inactive years MUST NOT be displayed in client navigation or movie filters.
      const activeYears = candidateYears
        .filter((y) => y.isActive !== false)
        .sort((a, b) => {
          const numA = parseInt(a.name, 10) || 0;
          const numB = parseInt(b.name, 10) || 0;
          return numB - numA;
        });

      this.cachedActiveYears = activeYears;
      this.inFlightPromise = null;
      return activeYears;
    })();

    return this.inFlightPromise;
  }

  /**
   * Clears in-memory client cache (e.g. on manual refresh or socket update).
   */
  clearCache(): void {
    this.cachedActiveYears = null;
    this.inFlightPromise = null;
  }
}

export const yearClientService = new YearClientService();
