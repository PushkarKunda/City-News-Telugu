// services/api/location.ts
import { request } from './client';
import { API_ROUTES } from './routes';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Language {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  state_id: number;
}

export interface City {
  id: number;
  name: string;
  district_id: number;
}

export interface HierarchyCity {
  id: number;
  name: string;
}

export interface HierarchyDistrict {
  id: number;
  name: string;
  cities: HierarchyCity[];
}

export interface StateHierarchy {
  id: number;
  name: string;
  language: Language;
  districts: HierarchyDistrict[];
}

export interface StateLanguage {
  state_id: number;
  state_name: string;
  language_id: number;
  language_name: string;
  language_code: string;
}

export interface LocationSearchResult {
  id: number;
  name: string;
  type: 'state' | 'district' | 'city';
  state_id: number;
  state_name: string;
  display_name: string;
  district_id?: number;
}

export interface LocationSearchParams {
  query: string;
  limit?: number;
  type?: 'state' | 'district' | 'city';
}

export interface LocationRequirements {
  requiresState: boolean;
  requiresDistrict: boolean;
  requiresCity: boolean;
  message?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Only AP (1) and Telangana (2) have full district/city support
const SUPPORTED_STATE_IDS = [1, 2];

// Only these 3 languages shown to users
const ALLOWED_LANGUAGE_CODES = ['te', 'hi', 'en'] as const;
export type AllowedLanguageCode = (typeof ALLOWED_LANGUAGE_CODES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Only AP (1) and Telangana (2) have district/city data
 */
export const isStateSupportedForLocations = (stateId: number): boolean => {
  return SUPPORTED_STATE_IDS.includes(stateId);
};

/**
 * Check if language is one of allowed 3
 */
export const isAllowedLanguage = (code: string): code is AllowedLanguageCode => {
  return (ALLOWED_LANGUAGE_CODES as readonly string[]).includes(code);
};

/**
 * Get what fields are required based on language + state
 *
 * English → state only (even AP/TS)
 * Hindi   → state only (even AP/TS)
 * Telugu + AP/TS   → state + district + city
 * Telugu + Others  → state only
 */
export const getLocationRequirements = (
  languageCode: string | null,
  stateId?: number
): LocationRequirements => {
  if (!languageCode) {
    return {
      requiresState: false,
      requiresDistrict: false,
      requiresCity: false,
    };
  }

  // English - ALWAYS state only regardless of state
  if (languageCode === 'en') {
    return {
      requiresState: true,
      requiresDistrict: false,
      requiresCity: false,
      message: 'Please select your state.',
    };
  }

  // Hindi - ALWAYS state only regardless of state
  if (languageCode === 'hi') {
    return {
      requiresState: true,
      requiresDistrict: false,
      requiresCity: false,
      message: 'Please select your state.',
    };
  }

  // Telugu + AP or Telangana = full location required
  if (
    languageCode === 'te' &&
    stateId !== undefined &&
    isStateSupportedForLocations(stateId)
  ) {
    return {
      requiresState: true,
      requiresDistrict: true,
      requiresCity: true,
      message: 'Please select your state, district, and city.',
    };
  }

  // Telugu + other state = state only
  if (languageCode === 'te') {
    return {
      requiresState: true,
      requiresDistrict: false,
      requiresCity: false,
      message: 'Please select your state.',
    };
  }

  return {
    requiresState: true,
    requiresDistrict: false,
    requiresCity: false,
  };
};

/**
 * Whether to show district + city pickers
 *
 * ONLY true when:
 * - Language is Telugu
 * - State is AP (1) or Telangana (2)
 *
 * English + AP  = false 
 * Hindi   + TS  = false 
 * Telugu  + AP  = true  
 * Telugu  + TS  = true 
 * Telugu  + KA  = false 
 */
export const shouldShowDistrictCity = (
  languageCode: string | null,
  stateId: number | null
): boolean => {
  if (!languageCode || !stateId) return false;
  return languageCode === 'te' && isStateSupportedForLocations(stateId);
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const locationApi = {

  // ─── Languages ────────────────────────────────────────────────────────────

  /**
   * GET /base/languages
   * Fetches all 12 languages, filters to Telugu, Hindi, English only
   */
  getLanguages: async (): Promise<Language[]> => {
    const allLanguages = await request<Language[]>({
      url: API_ROUTES.location.languages,
      method: 'GET',
    });

    return allLanguages.filter((lang) =>
      (ALLOWED_LANGUAGE_CODES as readonly string[]).includes(lang.code)
    );
  },

  /**
   * GET /base/languages/:id
   */
  getLanguageById: async (id: number): Promise<Language> => {
    return await request<Language>({
      url: API_ROUTES.location.languageById(id),
      method: 'GET',
    });
  },

  // ─── States ───────────────────────────────────────────────────────────────

  /**
   * GET /base/states
   * All 12 states load automatically
   */
  getStates: async (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<State[]> => {
    return await request<State[]>({
      url: API_ROUTES.location.states,
      method: 'GET',
      params,
    });
  },

  /**
   * GET /base/states/:id
   */
  getStateById: async (id: number): Promise<State> => {
    return await request<State>({
      url: API_ROUTES.location.stateById(id),
      method: 'GET',
    });
  },

  /**
   * GET /base/hierarchy/states/:id
   * Only AP (1) and Telangana (2) supported
   */
  getStateHierarchy: async (stateId: number): Promise<StateHierarchy> => {
    if (!isStateSupportedForLocations(stateId)) {
      throw new Error(
        'District and city data is only available for Andhra Pradesh and Telangana.'
      );
    }

    return await request<StateHierarchy>({
      url: API_ROUTES.location.stateHierarchy(stateId),
      method: 'GET',
    });
  },

  /**
   * GET /base/states/:id/language
   */
  getStateLanguage: async (stateId: number): Promise<StateLanguage> => {
    return await request<StateLanguage>({
      url: API_ROUTES.location.stateLanguage(stateId),
      method: 'GET',
    });
  },

  // ─── Districts ────────────────────────────────────────────────────────────

  /**
   * GET /base/districts
   * Filtered to AP and Telangana only
   */
  getDistricts: async (): Promise<District[]> => {
    const response = await request<District[]>({
      url: API_ROUTES.location.districts,
      method: 'GET',
    });

    return response.filter((d) => SUPPORTED_STATE_IDS.includes(d.state_id));
  },

  /**
   * Get districts by state ID
   * Returns empty array for unsupported states
   */
  getDistrictsByState: async (stateId: number): Promise<District[]> => {
    if (!isStateSupportedForLocations(stateId)) {
      return [];
    }

    const allDistricts = await locationApi.getDistricts();
    return allDistricts.filter((d) => d.state_id === stateId);
  },

  /**
   * Get districts from hierarchy (more efficient - includes cities)
   */
  getDistrictsFromHierarchy: async (
    stateId: number
  ): Promise<HierarchyDistrict[]> => {
    const hierarchy = await locationApi.getStateHierarchy(stateId);
    return hierarchy.districts;
  },

  /**
   * GET /base/districts/:id
   */
  getDistrictById: async (id: number): Promise<District> => {
    return await request<District>({
      url: API_ROUTES.location.districtById(id),
      method: 'GET',
    });
  },

  // ─── Cities ───────────────────────────────────────────────────────────────

  /**
   * GET /base/cities
   */
  getCities: async (): Promise<City[]> => {
    return await request<City[]>({
      url: API_ROUTES.location.cities,
      method: 'GET',
    });
  },

  /**
   * Get cities by district ID
   */
  getCitiesByDistrict: async (districtId: number): Promise<City[]> => {
    const allCities = await locationApi.getCities();
    return allCities.filter((c) => c.district_id === districtId);
  },

  /**
   * Get cities from hierarchy (more efficient)
   */
  getCitiesFromHierarchy: async (
    stateId: number,
    districtId: number
  ): Promise<HierarchyCity[]> => {
    const hierarchy = await locationApi.getStateHierarchy(stateId);
    const district = hierarchy.districts.find((d) => d.id === districtId);
    return district?.cities ?? [];
  },

  /**
   * GET /base/cities/:id
   */
  getCityById: async (id: number): Promise<City> => {
    return await request<City>({
      url: API_ROUTES.location.cityById(id),
      method: 'GET',
    });
  },

  // ─── Search ───────────────────────────────────────────────────────────────

  /**
   * GET /base/search?query=vi&limit=20
   */
  search: async (params: LocationSearchParams): Promise<LocationSearchResult[]> => {
    return await request<LocationSearchResult[]>({
      url: API_ROUTES.location.search,
      method: 'GET',
      params: {
        query: params.query,
        limit: params.limit ?? 20,
        ...(params.type && { type: params.type }),
      },
    });
  },

  /**
   * Search only within AP & Telangana
   */
  searchSupportedLocations: async (
    params: LocationSearchParams
  ): Promise<LocationSearchResult[]> => {
    const results = await locationApi.search(params);
    return results.filter((r) => SUPPORTED_STATE_IDS.includes(r.state_id));
  },
};