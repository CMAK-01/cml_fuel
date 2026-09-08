import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/bootstrap",
  "/api/health"
]);

const FULL_ACCESS = ["Administrateur", "Directeur QHSE", "DAF"];
const FLEET_ACCESS = [...FULL_ACCESS, "Responsable Achat", "Responsable Station"];
const API_ROLES: Record<string, string[]> = {
  "/api/dashboard": FULL_ACCESS,
  "/api/engines": FLEET_ACCESS,
  "/api/tanks": FLEET_ACCESS,
  "/api/refuelings": [...FLEET_ACCESS, "Utilisateur"],
  "/api/stock-entries": FULL_ACCESS,
  "/api/drivers": FULL_ACCESS,
  "/api/suppliers": FULL_ACCESS,
  "/api/alerts": FULL_ACCESS,
  "/api/ai-predictions": FULL_ACCESS,
  "/api/audit": FULL_ACCESS,
  "/api/users": FULL_ACCESS,
  "/api/backup": ["Administrateur"],
  "/api/backup/import": ["Administrateur"],
  "/api/seed": ["Administrateur"],
  "/api/archive": [...FULL_ACCESS, "Responsable Achat"],
  "/api/archive-requests": [...FULL_ACCESS, "Responsable Achat"]
};

export function proxy(request: NextRequest) {
  if (PUBLIC_API_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const allowedRoles = API_ROLES[request.nextUrl.pathname];
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Accès refusé pour ce rôle." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
