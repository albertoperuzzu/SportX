import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Controllo "grossolano" sul cookie; i permessi veri sono verificati sul DB in ogni pagina/azione (requireUser).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (session.mcp && pathname !== "/cambia-password") {
    return NextResponse.redirect(new URL("/cambia-password", req.url));
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/calendario", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|ico|webp)$).*)"],
};
