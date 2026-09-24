// hooks/useApi.ts
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, locationApi } from '@/services/api';
import type { Category, CategoryMenuItem } from '@/services/api/categories';
import type { Language, State, District, City } from '@/services/api/location';

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS - Centralized key management
// ═══════════════════════════════════════════════════════════════════════════

const queryKeys = {
  categories: {
    list: ['categories', 'list'] as const,
    menu: ['categories', 'menu'] as const,
    all: ['categories', 'all'] as const,
  },
  languages: {
    list: ['languages', 'list'] as const,
  },
  states: {
    list: ['states', 'list'] as const,
  },
  districts: {
    byState: (stateId: string | null) => ['districts', 'by-state', stateId] as const,
  },
  cities: {
    byDistrict: (districtId: string | null) => ['cities', 'by-district', districtId] as const,
  },
  location: {
    hierarchy: (stateId: number | null) => ['location', 'hierarchy', stateId] as const,
    search: (params: any) => ['location', 'search', params] as const,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get language glyph for UI display
 */
const getGlyphForLanguage = (code: string, name: string): string => {
  const glyphs: Record<string, string> = {
    en: 'Aa',
    hi: 'अ',
    te: 'అ',
  };
  return glyphs[code.toLowerCase()] || name.charAt(0);
};

/**
 * Map frontend state ID to backend state ID
 * Frontend: 'ap', 'ts', or numeric string
 * Backend: 1 (AP), 2 (TS), or numeric ID
 */
const mapStateIdToBackend = (frontendStateId: string): number | null => {
  if (frontendStateId === 'ap') return 1;
  if (frontendStateId === 'ts') return 2;

  const parsed = Number(frontendStateId);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Map backend state to frontend format
 */
const mapStateToFrontend = (state: State) => ({
  id: state.name.toLowerCase() === 'andhra pradesh'
    ? 'ap'
    : state.name.toLowerCase() === 'telangana'
      ? 'ts'
      : String(state.id),
  backendId: state.id,
  name: state.name,
  code: state.name.toLowerCase() === 'andhra pradesh'
    ? 'AP'
    : state.name.toLowerCase() === 'telangana'
      ? 'TS'
      : state.name.substring(0, 2).toUpperCase(),
});

/**
 * Map backend district to frontend format
 */
const mapDistrictToFrontend = (district: District, frontendStateId: string) => ({
  id: district.name.toLowerCase() === 'hyderabad'
    ? 'hyderabad'
    : district.name.toLowerCase() === 'visakhapatnam'
      ? 'visakhapatnam'
      : String(district.id),
  backendId: district.id,
  name: district.name,
  code: district.name.substring(0, 3).toUpperCase(),
  stateId: frontendStateId,
});

/**
 * Map backend city to frontend format
 */
const mapCityToFrontend = (city: City) => ({
  id: String(city.id),
  backendId: city.id,
  name: city.name,
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all categories with full details
 * Cached for 30 minutes (categories rarely change)
 */
export function useCategoriesList() {
  return useQuery({
    queryKey: queryKeys.categories.list,
    queryFn: () => categoriesApi.list(),
    staleTime: 1000 * 60 * 30, // 30 min
    gcTime: 1000 * 60 * 60,    // 1 hour
  });
}

/**
 * Get lightweight category menu items
 * Perfect for navigation headers
 */
export function useCategoriesMenu() {
  return useQuery({
    queryKey: queryKeys.categories.menu,
    queryFn: () => categoriesApi.getMenu(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * Get all categories (comprehensive)
 */
export function useCategoriesAll() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoriesApi.getAll(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get languages (Telugu, Hindi, English only) with display glyphs
 * Returns: [{ id: 'te', name: 'Telugu', glyph: 'అ' }, ...]
 */
export function useLanguagesList() {
  return useQuery({
    queryKey: queryKeys.languages.list,
    queryFn: async () => {
      const languages = await locationApi.getLanguages();
      return languages.map((lang) => ({
        id: lang.code,
        backendId: lang.id,
        name: lang.name,
        glyph: getGlyphForLanguage(lang.code, lang.name),
      }));
    },
    staleTime: 1000 * 60 * 60,  // 1 hour
    gcTime: 1000 * 60 * 120,    // 2 hours
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all states (12 total)
 * Returns frontend-friendly format with 'ap', 'ts' IDs
 */
export function useStatesList() {
  return useQuery({
    queryKey: queryKeys.states.list,
    queryFn: async () => {
      const states = await locationApi.getStates();
      return states.map(mapStateToFrontend);
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTRICTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get districts by state
 * Only returns data for AP (1) and Telangana (2)
 * Returns empty array for other states
 * 
 * @param stateId - Frontend state ID ('ap', 'ts', or numeric string)
 */
export function useDistrictsList(stateId: string | null) {
  return useQuery({
    queryKey: queryKeys.districts.byState(stateId),
    queryFn: async () => {
      if (!stateId) return [];

      const backendStateId = mapStateIdToBackend(stateId);
      if (backendStateId === null) return [];

      const districts = await locationApi.getDistricts();

      return districts
        .filter((district) => district.state_id === backendStateId)
        .map((district) => mapDistrictToFrontend(district, stateId));
    },
    enabled: Boolean(stateId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get cities by district
 * 
 * @param districtId - Frontend district ID (string or 'hyderabad', 'visakhapatnam')
 */
export function useCitiesList(districtId: string | null) {
  return useQuery({
    queryKey: queryKeys.cities.byDistrict(districtId),
    queryFn: async () => {
      if (!districtId) return [];

      // Handle special district IDs
      let backendDistrictId: number | null = null;

      if (districtId === 'hyderabad') {
        // Find Hyderabad district ID from backend
        const allDistricts = await locationApi.getDistricts();
        const hyderabadDistrict = allDistricts.find(
          d => d.name.toLowerCase() === 'hyderabad'
        );
        backendDistrictId = hyderabadDistrict?.id ?? null;
      } else if (districtId === 'visakhapatnam') {
        const allDistricts = await locationApi.getDistricts();
        const vizagDistrict = allDistricts.find(
          d => d.name.toLowerCase() === 'visakhapatnam'
        );
        backendDistrictId = vizagDistrict?.id ?? null;
      } else {
        const parsed = Number(districtId);
        backendDistrictId = Number.isFinite(parsed) ? parsed : null;
      }

      if (backendDistrictId === null) return [];

      const cities = await locationApi.getCitiesByDistrict(backendDistrictId);
      return cities.map(mapCityToFrontend);
    },
    enabled: Boolean(districtId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE HIERARCHY (Nested structure with districts + cities)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get state hierarchy (districts + cities)
 * Only works for AP (1) and Telangana (2)
 * More efficient than separate calls when you need the full structure
 * 
 * @param stateId - Backend state ID (1 for AP, 2 for Telangana)
 */
export function useStateHierarchy(stateId: number | null) {
  return useQuery({
    queryKey: queryKeys.location.hierarchy(stateId),
    queryFn: () => {
      if (!stateId) throw new Error('State ID required');
      return locationApi.getStateHierarchy(stateId);
    },
    enabled: Boolean(stateId) && (stateId === 1 || stateId === 2),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION SEARCH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search locations (states, districts, cities)
 * Unified search across all location types
 */
export function useLocationSearch(params: {
  query: string;
  limit?: number;
  type?: 'state' | 'district' | 'city';
}) {
  return useQuery({
    queryKey: queryKeys.location.search(params),
    queryFn: () => locationApi.search(params),
    enabled: params.query.length > 0,
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Search only AP & Telangana locations
 * Filtered to supported states only
 */
export function useSupportedLocationSearch(params: {
  query: string;
  limit?: number;
  type?: 'state' | 'district' | 'city';
}) {
  return useQuery({
    queryKey: [...queryKeys.location.search(params), 'supported'],
    queryFn: () => locationApi.searchSupportedLocations(params),
    enabled: params.query.length > 0,
    staleTime: 1000 * 60 * 30,
  });
}