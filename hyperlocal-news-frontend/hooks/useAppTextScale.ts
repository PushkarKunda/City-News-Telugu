import { useAuthStore } from '@/store/authStore';

export function useAppTextScale() {
  const { user } = useAuthStore();
  const size = 'medium';
  
  return 1.0;
}
