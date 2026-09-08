// RBAC CML – Rôles et permissions d'accès aux modules
// - Administrateur : accès total
// - Directeur QHSE : accès total
// - DAF (Directeur Administratif et Financier) : accès total
// - Responsable Achat : Ravitaillement + Parc Engins + Cuves (+ Administration pour valider les archivages)
// - Responsable Station : Ravitaillement + Parc Engins + Cuves
// - Utilisateur : Ravitaillement uniquement

export const ROLES = [
  "Administrateur",
  "Directeur QHSE",
  "DAF",
  "Responsable Achat",
  "Responsable Station",
  "Utilisateur"
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PROFILES: Record<string, { name: string; dept: string }> = {
  "Administrateur": { name: "Kouassi Jean-Baptiste", dept: "Direction Générale" },
  "Directeur QHSE": { name: "Traoré Aminata", dept: "QHSE & Conformité" },
  "DAF": { name: "N'Dri Sylvie", dept: "Direction Administrative & Financière" },
  "Responsable Achat": { name: "Silué Bernard", dept: "Achats & Approvisionnements" },
  "Responsable Station": { name: "Koné Seydou", dept: "Station Service Carburant" },
  "Utilisateur": { name: "Opérateur Terrain", dept: "Exploitation Mine" }
};

const ALL_TABS = [
  "dashboard", "refueling", "engines", "tanks", "stock",
  "spc", "spc-control", "drivers", "users", "ai", "reports", "audit", "admin", "mobile"
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Accès total
  "Administrateur": ALL_TABS,
  "Directeur QHSE": ALL_TABS,
  "DAF": ALL_TABS,
  // Ravitaillement + Parc Engins + Cuves (+ Administration pour validation des demandes d'archivage)
  "Responsable Achat": ["refueling", "engines", "tanks", "admin"],
  // Ravitaillement + Parc Engins + Cuves
  "Responsable Station": ["refueling", "engines", "tanks"],
  // Ravitaillement uniquement
  "Utilisateur": ["refueling"]
};

export function canAccess(role: string, tabId: string): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(tabId);
}

export function getDefaultTab(role: string): string {
  const allowed = ROLE_PERMISSIONS[role] || ["refueling"];
  return allowed.includes("dashboard") ? "dashboard" : allowed[0];
}

/** Seuls Administrateur et Directeur QHSE peuvent modifier des informations existantes. */
export function canModify(role: string): boolean {
  return role === "Administrateur" || role === "Directeur QHSE";
}
