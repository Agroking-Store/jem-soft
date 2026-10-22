/**
 * Resolves a backend file URL (e.g., uploaded bills, claim documents) to a full,
 * deployable URL using NEXT_PUBLIC_API_URL or defaults to localhost in development.
 */
export const getBackendFileUrl = (url?: string | null): string => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const host = apiBase.replace(/\/api\/?$/, "");
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${host}${normalizedPath}`;
};
