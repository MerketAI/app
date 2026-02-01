import { useAuthStore } from '@/store/auth';

export const useAuth = () => {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    verify,
    logout,
    fetchUser,
  } = useAuthStore();

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    verify,
    logout,
    fetchUser,
  };
};
