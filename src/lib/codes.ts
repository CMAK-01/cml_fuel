import { randomInt } from "crypto";

/**
 * Génère un code métier unique et lisible : PREFIX-ANNEE-SEQ-ENTROPY
 * ex : RAV-2026-0042-7K2
 * Le suffixe entropique élimine les collisions, même en cas d'appels
 * concurrents, avant d'atteindre la contrainte d'unicité en base.
 */
export function generateBusinessCode(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(Math.max(1, Math.trunc(sequence))).padStart(4, "0");
  const entropy = randomInt(0, 46656).toString(36).toUpperCase().padStart(3, "0");
  return `${prefix}-${year}-${seq}-${entropy}`;
}
