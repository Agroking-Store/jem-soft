import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const CUSTOMER_PORTAL_ROUTES = ["/customer-portal"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const customerPortalToken = request.cookies.get("customerPortalToken")?.value;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isCustomerPortalRoute = CUSTOMER_PORTAL_ROUTES.some((r) => pathname.startsWith(r));

  // Customer portal route protection
  if (isCustomerPortalRoute) {
    if (!customerPortalToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // If logged in customer portal user tries to access /login, send to portal
  if (isPublicRoute && customerPortalToken && !token) {
    return NextResponse.redirect(new URL("/customer-portal", request.url));
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