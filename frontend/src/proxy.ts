import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const CLIENT_PORTAL_ROUTES = ["/client-portal"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const clientPortalToken = request.cookies.get("clientPortalToken")?.value;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isClientPortalRoute = CLIENT_PORTAL_ROUTES.some((r) => pathname.startsWith(r));

  // Client portal route protection
  if (isClientPortalRoute) {
    if (!clientPortalToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // If logged in client portal user tries to access /login, send to portal
  if (isPublicRoute && clientPortalToken && !token) {
    return NextResponse.redirect(new URL("/client-portal", request.url));
  }

  // If no system token and not on public route -> redirect to login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If system token and on public route -> redirect to dashboard
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};