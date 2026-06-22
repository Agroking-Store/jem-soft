import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const ADMIN_ROUTES = ["/dashboard"];
const CLIENT_ROUTES = ["/client-dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;
  const userCookie = request.cookies.get("user")?.value;
  
  let userRole = null;
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie);
      userRole = user.role;
    } catch (e) {
      // Invalid JSON
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isClientRoute = CLIENT_ROUTES.some(route => pathname.startsWith(route));

  // If no token and not on public route -> redirect to login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If token and on public route -> redirect based on role
  if (token && isPublicRoute) {
    if (userRole === "CLIENT") {
      return NextResponse.redirect(new URL("/client-dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Role-based access control for protected routes
  if (token && !isPublicRoute) {
    // Client trying to access admin routes
    if (userRole === "CLIENT" && isAdminRoute) {
      return NextResponse.redirect(new URL("/client-dashboard", request.url));
    }
    
    // Admin/Advisor trying to access client routes
    if (userRole !== "CLIENT" && isClientRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};