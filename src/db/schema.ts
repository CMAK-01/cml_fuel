import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  date
} from "drizzle-orm/pg-core";

// Users & RBAC
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("Responsable Carburant"), // Administrateur, Responsable Carburant, Responsable Achat, QHSE-RC, Directeur QHSE, Magasinier, Superviseur Mine, Direction
  department: text("department").default("Carburant"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow()
});

// Base Engins (150+ equipment support)
export const engines = pgTable("engines", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. EX-395-01, D8T-02, LV-TOY-05
  immatriculation: text("immatriculation").notNull(),
  type: text("type").notNull(), // "Minier Lourd" (HD/Pelle/Bull/Foreuse) vs "Véhicule Léger (LV)"
  category: text("category").notNull(), // Pelle, Tombereau, Bulldozer, Foreuse, Niveleuse, Pick-up, Groupe Électrogène
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  department: text("department").notNull(), // Extraction Mine, Laverie / Traitement, Forage & Dynamitage, Maintenance & Logistique, Direction & Administration
  assignment: text("assignment").notNull(), // Fosse 1, Fosse 2, Base de vie, Piste principale
  normalConsumption: doublePrecision("normal_consumption").notNull(), // L/H or L/100km
  unit: text("unit").notNull().default("L/H"), // "L/H" for heavy mining, "L/100km" for LV
  tankCapacity: integer("tank_capacity").notNull(),
  commissionDate: date("commission_date").notNull(),
  status: text("status").notNull().default("Actif"), // Actif, En Maintenance, Arrêté
  photo: text("photo"),
  currentHoursOrKm: doublePrecision("current_hours_or_km").default(0),
  baseline30d: doublePrecision("baseline_30d"), // Dynamic baseline over last 30 days
  createdAt: timestamp("created_at").defaultNow()
});

// Chauffeurs & Opérateurs engins
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  matricule: text("matricule").notNull().unique(),
  phone: text("phone").notNull(),
  department: text("department").notNull(),
  licenseType: text("license_type").notNull(),
  licenseExpiry: date("license_expiry").notNull(),
  status: text("status").notNull().default("Actif"),
  totalConsumedLiters: doublePrecision("total_consumed_liters").default(0),
  efficiencyScore: doublePrecision("efficiency_score").default(98.5), // % vs standard
  createdAt: timestamp("created_at").defaultNow()
});

// Fournisseurs carburant
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  averagePricePerLiter: doublePrecision("average_price_per_liter").notNull().default(855), // FCFA/L
  totalDeliveredLiters: doublePrecision("total_delivered_liters").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Cuves & Camions Citernes CML
export const tanks = pgTable("tanks", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Cuve001, Cuve002, Cuve003, CC01, CC02
  name: text("name").notNull(),
  type: text("type").notNull(), // "Cuve Fixe Station" vs "Camion Citerne Mobile"
  capacity: integer("capacity").notNull(), // 50000, 14000, 20000
  currentLevel: doublePrecision("current_level").notNull(), // liters
  location: text("location").notNull(), // "Station Service Usine" vs "Mobile – Distribution zones"
  lastRefillDate: timestamp("last_refill_date").defaultNow(),
  minAlertLevel: integer("min_alert_level").default(10000),
  createdAt: timestamp("created_at").defaultNow()
});

// Entrées carburant (Réceptions de stock avec correction thermique)
export const stockEntries = pgTable("stock_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  time: text("time").notNull(), // Obligatory time
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  tankId: integer("tank_id").notNull(),
  tankCode: text("tank_code").notNull(),
  blNumber: text("bl_number").notNull(), // Bon de livraison
  rawQuantity: doublePrecision("raw_quantity").notNull(), // Quantité brute reçue
  temperature: doublePrecision("temperature").default(15), // Température en °C (ex: 38°C à Abidjan)
  correctedQuantity: doublePrecision("corrected_quantity").notNull(), // Volume corrigé à 15°C ISO
  unitPrice: doublePrecision("unit_price").notNull(), // FCFA/L
  totalAmount: doublePrecision("total_amount").notNull(), // FCFA
  operator: text("operator").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Transferts entre cuves et camions citernes
export const tankTransfers = pgTable("tank_transfers", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  sourceTankId: integer("source_tank_id").notNull(),
  sourceTankCode: text("source_tank_code").notNull(),
  destTankId: integer("dest_tank_id").notNull(),
  destTankCode: text("dest_tank_code").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  operator: text("operator").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Historique des Ravitaillements d'Engins
export const refuelings = pgTable("refuelings", {
  id: serial("id").primaryKey(),
  refuelingCode: text("refueling_code").notNull().unique(),
  date: date("date").notNull(),
  time: text("time").notNull(), // e.g., 08:30 or 23:15
  engineId: integer("engine_id").notNull(),
  engineCode: text("engine_code").notNull(),
  driverId: integer("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  meterReading: doublePrecision("meter_reading").notNull(), // Horamètre ou Odomètre
  previousMeterReading: doublePrecision("previous_meter_reading").default(0),
  workDone: doublePrecision("work_done").default(0), // Heures de travail ou km parcourus
  quantity: doublePrecision("quantity").notNull(), // Litres distribués (déduit de la cuve)
  unitPrice: doublePrecision("unit_price").notNull(), // FCFA
  totalAmount: doublePrecision("total_amount").notNull(), // FCFA
  tankId: integer("tank_id").notNull(),
  tankCode: text("tank_code").notNull(),
  refuelingPoint: text("refueling_point").notNull(), // "À la station service" vs "Sur zone (citerne CC01/CC02)"
  service: text("service").notNull(), // Service auquel l'engin est rattaché au moment du ravitaillement (ex: "Extraction Mine", "Forage", "Laverie", "Logistique", "Direction")
  operator: text("operator").notNull(),
  observation: text("observation"),
  photoMeterUrl: text("photo_meter_url"),
  signatureUrl: text("signature_url"),
  realConsumption: doublePrecision("real_consumption").default(0), // L/H or L/100km
  referenceConsumption: doublePrecision("reference_consumption").default(0),
  deviationPercent: doublePrecision("deviation_percent").default(0),
  alertLevel: text("alert_level").default("Normal"), // Normal (<=15%), Surveillance (15-25%), Alerte Rouge (25-40%), Critique (>40%)
  supervisorValidation: text("supervisor_validation"), // Requis si > 500 L
  isLocked: boolean("is_locked").default(false), // Locked after 24h
  lastModifiedAt: timestamp("last_modified_at"),
  lastModifiedReason: text("last_modified_reason"),
  createdAt: timestamp("created_at").defaultNow()
});

// Moteur de détection & Alertes
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "Surconsommation", "Hors Plage Horaire", "Double Ravitaillement", "Compteur Incohérent", "Stock Faible", "Validation Requise"
  severity: text("severity").notNull(), // "Normal", "Surveillance", "Alerte Rouge", "Critique"
  engineCode: text("engine_code"),
  tankCode: text("tank_code"),
  message: text("message").notNull(),
  date: timestamp("date").defaultNow(),
  status: text("status").notNull().default("Ouverte"), // "Ouverte", "Résolue", "Investiguée"
  resolvedBy: text("resolved_by"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow()
});

// Journal d'Audit inaltérable
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user: text("user").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(), // e.g. "Saisie Ravitaillement", "Modification Ravitaillement (>24h)", "Réception Stock"
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address")
});

// Circuit de validation d'archivage : Admin (demande) → Responsable Achat → Directeur QHSE → Exécution
export const archiveRequests = pgTable("archive_requests", {
  id: serial("id").primaryKey(),
  requestCode: text("request_code").notNull().unique(), // ex: DEM-ARC-2026-0001
  periodLabel: text("period_label").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date").notNull(),
  requestedBy: text("requested_by").notNull(), // Administrateur
  requestedByRole: text("requested_by_role").notNull().default("Administrateur"),
  requestDate: timestamp("request_date").defaultNow(),
  requestNotes: text("request_notes"),
  resetOperationalData: boolean("reset_operational_data").default(true),
  // Étape 1 : Responsable Achat
  achatDecision: text("achat_decision"), // null = en attente, "Validée", "Rejetée"
  achatValidatorName: text("achat_validator_name"),
  achatComment: text("achat_comment"),
  achatDecisionDate: timestamp("achat_decision_date"),
  // Étape 2 : Directeur QHSE
  qhseDecision: text("qhse_decision"), // null = en attente, "Validée", "Rejetée"
  qhseValidatorName: text("qhse_validator_name"),
  qhseComment: text("qhse_comment"),
  qhseDecisionDate: timestamp("qhse_decision_date"),
  // Statut global du workflow
  status: text("status").notNull().default("En attente Achat"), // "En attente Achat", "En attente QHSE", "Exécutée & Scellée", "Rejetée"
  archiveId: integer("archive_id"), // lien vers dataArchives une fois exécutée
  archiveCode: text("archive_code"),
  createdAt: timestamp("created_at").defaultNow()
});

// Archivage sécurisé des périodes carburant – Administrateur après double validation Achat + QHSE
export const dataArchives = pgTable("data_archives", {
  id: serial("id").primaryKey(),
  archiveCode: text("archive_code").notNull().unique(), // ex: ARC-2026-Q1
  periodLabel: text("period_label").notNull(), // ex: "Trimestre 1 2026 – Clôture Carburant CML"
  startDate: date("start_date"),
  endDate: date("end_date"),
  archivedBy: text("archived_by").notNull(), // Administrateur
  archivedByRole: text("archived_by_role").notNull().default("Administrateur"),
  // Double validation obligatoire
  achatValidatorName: text("achat_validator_name").notNull(),
  achatValidatorRole: text("achat_validator_role").notNull().default("Responsable Achat"),
  achatValidationDate: timestamp("achat_validation_date").defaultNow(),
  achatValidationSignature: text("achat_validation_signature"),
  qhseValidatorName: text("qhse_validator_name").notNull(),
  qhseValidatorRole: text("qhse_validator_role").notNull().default("Directeur QHSE"),
  qhseValidationDate: timestamp("qhse_validation_date").defaultNow(),
  qhseValidationSignature: text("qhse_validation_signature"),
  // Statistiques archivées
  totalRefuelings: integer("total_refuelings").default(0),
  totalLiters: doublePrecision("total_liters").default(0),
  totalAmountFcfa: doublePrecision("total_amount_fcfa").default(0),
  totalStockEntries: integer("total_stock_entries").default(0),
  totalAlerts: integer("total_alerts").default(0),
  totalAuditLogs: integer("total_audit_logs").default(0),
  snapshotJson: text("snapshot_json"), // JSON complet compressé
  notes: text("notes"),
  status: text("status").notNull().default("Archivé"), // Archivé, Scellé, Restauré
  createdAt: timestamp("created_at").defaultNow()
});
