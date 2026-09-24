// services/api/categories.ts
import { API_ROUTES } from './routes';
import { request } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
  news_count: number;
  description?: string;
}

export interface CategoryMenuItem {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toSlug = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, '-');

// ─── API ─────────────────────────────────────────────────────────────────────

export const categoriesApi = {
  /**
   * GET /categories/all
   * Get all categories with full details
   */
  getAll: async (): Promise<Category[]> => {
    const response = await request<Category[]>({
      url: API_ROUTES.categories.all,
      method: 'GET',
    });

    return response.map((cat) => ({
      ...cat,
      slug: toSlug(cat.name),
      image_url: cat.image_url ?? undefined,
      color: cat.color ?? undefined,
      description: cat.description ?? undefined,
    }));
  },

  /**
   * GET /categories/
   * Get basic category list
   */
  list: async (): Promise<Category[]> => {
    const response = await request<Category[]>({
      url: API_ROUTES.categories.list,
      method: 'GET',
    });

    return response.map((cat) => ({
      ...cat,
      slug: toSlug(cat.name),
      image_url: cat.image_url ?? undefined,
      color: cat.color ?? undefined,
      description: cat.description ?? undefined,
    }));
  },

  /**
   * GET /categories/menu
   * Get categories for menu/navigation (lightweight)
   */
  getMenu: async (): Promise<CategoryMenuItem[]> => {
    const response = await request<Category[]>({
      url: API_ROUTES.categories.menu,
      method: 'GET',
    });

    return response.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: toSlug(cat.name),
      icon: cat.image_url ?? undefined,
      color: cat.color ?? undefined,
      is_active: cat.is_active,
    }));
  },

  /**
   * GET /categories/:id/news
   * Get news articles by category ID
   * Note: Returns news articles, not categories
   * (This is already in newsApi.getByCategory, but included here for completeness)
   */
  getNewsByCategory: async (categoryId: number): Promise<any[]> => {
    return await request<any[]>({
      url: API_ROUTES.categories.news(categoryId),
      method: 'GET',
    });
  },
};