# Plan d'optimisation CML Fuel

## Étapes
- [x] 1. Optimiser `src/app/api/dashboard/route.ts`
  - [x] Corriger le filtre mensuel (bug logique)
  - [x] Supprimer les valeurs fallback artificielles
  - [x] Réduire les calculs inutiles côté mémoire (agrégations réelles, SPC sur données réelles)
- [x] 2. Optimiser `src/app/page.tsx`
  - [x] Introduire lazy loading des vues d'onglets (dynamic imports)
  - [x] Garder la logique RBAC et handlers existants
  - [x] Préparer le terrain pour extraction future de hook de données
- [x] 3. Vérifications
  - [x] Lint (0 erreur)
  - [x] Typecheck (0 erreur)
  - [x] Validation fonctionnelle rapide (build production OK, 24 routes, proxy actif)
