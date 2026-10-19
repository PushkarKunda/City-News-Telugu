import { ZodSchema } from 'zod';
import { getApiError } from './client';

// Define ApiError type here (no external import needed)
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export const validateResponse = <T>(schema: ZodSchema<T>, data: unknown): { data?: T; error?: ApiError } => {
  try {
    const result = schema.parse(data);
    return { data: result };
  } catch (err: any) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: err?.message || 'Response validation failed',
        details: err?.errors ? { zod: err.errors } : null,
      },
    };
  }
};

export const wrapAndValidate = async <T>(fn: () => Promise<T>, schema?: ZodSchema<T>) => {
  try {
    const data = await fn();
    if (!schema) return { data };
    const v = validateResponse(schema, data);
    if (v.error) return { error: v.error };
    return { data: v.data };
  } catch (err) {
    return { error: getApiError(err) };
  }
};
