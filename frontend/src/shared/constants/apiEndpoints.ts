const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const API_ENDPOINTS = {
  auth: {
    register: `${BASE}/auth/register`,
    login: `${BASE}/auth/login`,
  },
  clients: {
    base: `${BASE}/clients`,
    login: `${BASE}/clients/login`,
    byId: (id: string) => `${BASE}/clients/${id}`,
  },
} as const;
