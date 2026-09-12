export const ROLES = {
  ADMIN: 'Administrateur',
  DAF: 'DAF',
  RESP_ACHAT: 'Responsable Achat',
  CONDUCTEUR: 'Conducteur',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.DAF]: ['read:all', 'write:fuel', 'write:drivers'],
  [ROLES.RESP_ACHAT]: ['read:all', 'write:purchase'],
  [ROLES.CONDUCTEUR]: ['read:self', 'write:refueling'],
};

export const DEFAULT_ROLE = ROLES.CONDUCTEUR;
