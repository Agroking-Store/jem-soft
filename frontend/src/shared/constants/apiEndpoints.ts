const BASE = process.env.NEXT_PUBLIC_API_URL;

export const API_ENDPOINTS = {
  auth: {
    register: `${BASE}/auth/register`,
    login: `${BASE}/auth/login`,
  },
} as const;
