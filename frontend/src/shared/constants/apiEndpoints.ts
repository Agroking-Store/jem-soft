const BASE = process.env.NEXT_PUBLIC_API_URL;

export const API_ENDPOINTS = {
  auth: {
    register: `${BASE}/auth/register`,
    login: `${BASE}/auth/login`,
  },
  customers: {
    base: `${BASE}/customers`,
    login: `${BASE}/customers/login`,
    byId: (id: string) => `${BASE}/customers/${id}`,
  },
  users: {
    base: `${BASE}/users`,
    byId: (id: string) => `${BASE}/users/${id}`,
    resetPassword: (id: string) => `${BASE}/users/${id}/reset-password`,
    updateProfile: `${BASE}/users/updateProfile`,
  },
} as const;
