import { db } from "@/db";
import {
  users,
  engines,
  drivers,
  suppliers,
  tanks,
  stockEntries,
  refuelings,
  alerts,
  auditLogs,
  dataArchives,
  archiveRequests,
  tankTransfers
} from "@/db/schema";
import { sql } from "drizzle-orm";
import { ENGINES_LIST } from "./seed-engines";
import { hashPassword } from "./auth";

export async function seedDatabase(forceReset = false) {
  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("SEED_USER_PASSWORD must contain at least 12 characters before seeding users.");
  }
  if (forceReset) {
    await db.delete(auditLogs);
    await db.delete(alerts);
    await db.delete(refuelings);
    await db.delete(stockEntries);
    await db.delete(tankTransfers);
    await db.delete(archiveRequests);
    await db.delete(dataArchives);
    await db.delete(tanks);
    await db.delete(suppliers);
    await db.delete(drivers);
    await db.delete(engines);
    await db.delete(users);
  } else {
    const existingEngines = await db.select({ count: sql<number>`count(*)` }).from(engines);
    if (Number(existingEngines[0].count) > 0) {
      return { seeded: false, message: "La base CML contient déjà des données." };
    }
  }

  // 1. Users – 6 rôles officiels (accès complet : Administrateur, Directeur QHSE, DAF)
  await db.insert(users).values([
    { name: "Kouassi Jean-Baptiste", email: "admin@cml.ci", role: "Administrateur", department: "Direction Générale" },
    { name: "Traoré Aminata", email: "directeur.qhse@cml.ci", role: "Directeur QHSE", department: "QHSE & Conformité" },
    { name: "N'Dri Sylvie", email: "daf@cml.ci", role: "DAF", department: "Direction Administrative & Financière" },
    { name: "Silué Bernard", email: "achat@cml.ci", role: "Responsable Achat", department: "Achats & Approvisionnements" },
    { name: "Koné Seydou", email: "station@cml.ci", role: "Responsable Station", department: "Station Service Carburant" },
    { name: "Opérateur Terrain", email: "operateur@cml.ci", role: "Utilisateur", department: "Exploitation Mine" }
  ].map((user) => ({ ...user, passwordHash: hashPassword(seedPassword) })));

  // 2. Cuves & Camions Citernes
  const insertedTanks = await db.insert(tanks).values([
    {
      code: "Cuve001",
      name: "Cuve001 – Station service",
      type: "Cuve Fixe Station",
      capacity: 50000,
      currentLevel: 34000, // 68%
      location: "Station Service Usine",
      minAlertLevel: 10000
    },
    {
      code: "Cuve002",
      name: "Cuve002 – Station service",
      type: "Cuve Fixe Station",
      capacity: 50000,
      currentLevel: 42500, // 85%
      location: "Station Service Usine",
      minAlertLevel: 10000
    },
    {
      code: "Cuve003",
      name: "Cuve003 – Station service",
      type: "Cuve Fixe Station",
      capacity: 50000,
      currentLevel: 18000, // 36%
      location: "Station Service Usine",
      minAlertLevel: 10000
    },
    {
      code: "CC01",
      name: "CC01 – Camion Citerne 14 000 L",
      type: "Camion Citerne Mobile",
      capacity: 14000,
      currentLevel: 9800, // 70%
      location: "Mobile – Distribution zones",
      minAlertLevel: 2800
    },
    {
      code: "CC02",
      name: "CC02 – Camion Citerne 20 000 L",
      type: "Camion Citerne Mobile",
      capacity: 20000,
      currentLevel: 14000, // 70%
      location: "Mobile – Distribution zones",
      minAlertLevel: 4000
    }
  ]).returning();

  // 3. Fournisseurs
  await db.insert(suppliers).values([
    {
      name: "TotalEnergies Côte d'Ivoire",
      contactPerson: "Kouamé Eric (Directeur Grand Compte)",
      phone: "+225 07 07 12 34 56",
      email: "mines@totalenergies.ci",
      address: "Boulevard de Marseille, Zone 4, Abidjan",
      averagePricePerLiter: 855,
      totalDeliveredLiters: 450000
    },
    {
      name: "Vivo Energy (Shell CI)",
      contactPerson: "Diarrassouba Fanta",
      phone: "+225 05 05 88 99 00",
      email: "livraison@vivoenergy.ci",
      address: "Plateau, Tour C, Abidjan",
      averagePricePerLiter: 850,
      totalDeliveredLiters: 280000
    },
    {
      name: "Petroci Distribution",
      contactPerson: "N'Dri Christian",
      phone: "+225 01 02 03 04 05",
      email: "commercial@petroci.ci",
      address: "Vridi Zone Industrielle, Abidjan",
      averagePricePerLiter: 860,
      totalDeliveredLiters: 150000
    }
  ]);

  // 4. Chauffeurs / Opérateurs Engins
  await db.insert(drivers).values([
    { firstName: "Aboubakar", lastName: "Ouattara", matricule: "CML-CH-001", phone: "0708112233", department: "Extraction Mine", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2028-11-15", totalConsumedLiters: 14500, efficiencyScore: 99.2 },
    { firstName: "Koffi", lastName: "Amani", matricule: "CML-CH-002", phone: "0504556677", department: "Extraction Mine", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2027-06-20", totalConsumedLiters: 16200, efficiencyScore: 97.4 },
    { firstName: "Moussa", lastName: "Fofana", matricule: "CML-CH-003", phone: "0701998877", department: "Forage & Dynamitage", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2029-01-10", totalConsumedLiters: 9800, efficiencyScore: 96.1 },
    { firstName: "Gervais", lastName: "Kouadio", matricule: "CML-CH-004", phone: "0102334455", department: "Extraction Mine", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2028-03-30", totalConsumedLiters: 18900, efficiencyScore: 94.8 },
    { firstName: "Siaka", lastName: "Coulibaly", matricule: "CML-CH-005", phone: "0709445566", department: "Laverie / Traitement", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2027-12-12", totalConsumedLiters: 12400, efficiencyScore: 98.8 },
    { firstName: "Bertin", lastName: "Gohou", matricule: "CML-CH-006", phone: "0506778899", department: "Logistique & Pistes", licenseType: "Permis BCDE", licenseExpiry: "2028-08-14", totalConsumedLiters: 7600, efficiencyScore: 99.5 },
    { firstName: "Adama", lastName: "Sangaré", matricule: "CML-CH-007", phone: "0705123456", department: "Extraction Mine", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2027-09-05", totalConsumedLiters: 21500, efficiencyScore: 91.2 },
    { firstName: "Clément", lastName: "N'Guessan", matricule: "CML-CH-008", phone: "0103445566", department: "Direction & Administration", licenseType: "Permis B", licenseExpiry: "2029-05-20", totalConsumedLiters: 1200, efficiencyScore: 99.8 },
    { firstName: "Raoul", lastName: "Boni", matricule: "CML-CH-009", phone: "0704223344", department: "Forage & Dynamitage", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2028-02-18", totalConsumedLiters: 8900, efficiencyScore: 98.1 },
    { firstName: "Issiaka", lastName: "Touré", matricule: "CML-CH-010", phone: "0501889900", department: "Extraction Mine", licenseType: "Permis Engins Lourds (G)", licenseExpiry: "2027-11-25", totalConsumedLiters: 15400, efficiencyScore: 98.0 }
  ]);

  // 5. Engins Miniers CML – Liste complète des 150+ engins du fichier Excel CML
  const insertedEngines = await db.insert(engines).values(
    ENGINES_LIST.map(e => ({
      code: e.code,
      immatriculation: `CML-${e.code}`,
      type: e.type,
      category: e.categorie,
      brand: e.marque,
      model: e.wa,
      department: e.department,
      assignment: e.department === "Exploitation Minière" ? "Fosse Manganèse" : e.department.startsWith("Traitement") ? "Usine Concassage" : "Base de vie",
      normalConsumption: e.normalConsumption,
      unit: e.unit,
      tankCapacity: e.tankCapacity,
      commissionDate: "2023-01-01",
      status: "Actif",
      currentHoursOrKm: e.type === "Véhicule Léger (LV)" ? 50000 : 4000,
      baseline30d: e.normalConsumption
    }))
  ).returning();

  // 6. Historique de Réceptions Stock (Entrées avec Correction Thermique ISO)
  await db.insert(stockEntries).values([
    {
      date: "2026-03-25",
      time: "08:15",
      supplierId: 1,
      supplierName: "TotalEnergies Côte d'Ivoire",
      tankId: insertedTanks[0].id,
      tankCode: "Cuve001",
      blNumber: "BL-TE-99042",
      rawQuantity: 35000,
      temperature: 37.5,
      correctedQuantity: 34336, // ~664L dilatés en moins
      unitPrice: 855,
      totalAmount: 35000 * 855,
      operator: "Koné Seydou",
      notes: "Livraison par citerne semi-remorque. Température ambiante forte (37.5°C)."
    },
    {
      date: "2026-03-27",
      time: "09:30",
      supplierId: 2,
      supplierName: "Vivo Energy (Shell CI)",
      tankId: insertedTanks[1].id,
      tankCode: "Cuve002",
      blNumber: "BL-VE-44108",
      rawQuantity: 40000,
      temperature: 35.0,
      correctedQuantity: 39320,
      unitPrice: 850,
      totalAmount: 40000 * 850,
      operator: "Bamba Mamadou",
      notes: "Contrôle densité et température OK au dépotage."
    }
  ]);

  // 7. Ravitaillements avec champ 'service'
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  await db.insert(refuelings).values([
    {
      refuelingCode: "RAV-2026-0001",
      date: yesterdayStr,
      time: "07:30",
      engineId: insertedEngines.find(e => e.code === "EX-1001")?.id || 0,
      engineCode: "EX-1001",
      driverId: 1,
      driverName: "Aboubakar Ouattara",
      meterReading: 4850,
      previousMeterReading: 4840,
      workDone: 10,
      quantity: 630,
      unitPrice: 855,
      totalAmount: 630 * 855,
      tankId: insertedTanks.find(t => t.code === "CC01")?.id || 0,
      tankCode: "CC01",
      refuelingPoint: "Sur zone (citerne CC01/CC02)",
      service: "Extraction Mine",
      operator: "Opérateur CC01",
      observation: "Ravitaillement Fosse 1 en début de poste.",
      realConsumption: 63.0,
      referenceConsumption: 55.0,
      deviationPercent: 14.5,
      alertLevel: "Surveillance",
      supervisorValidation: "Yao Patrice (Superviseur)"
    },
    {
      refuelingCode: "RAV-2026-0002",
      date: yesterdayStr,
      time: "11:15",
      engineId: insertedEngines.find(e => e.code === "EX-1002")?.id || 0,
      engineCode: "EX-1002",
      driverId: 7,
      driverName: "Adama Sangaré",
      meterReading: 5080,
      previousMeterReading: 5072,
      workDone: 8,
      quantity: 416,
      unitPrice: 855,
      totalAmount: 416 * 855,
      tankId: insertedTanks.find(t => t.code === "CC01")?.id || 0,
      tankCode: "CC01",
      refuelingPoint: "Sur zone (citerne CC01/CC02)",
      service: "Extraction Mine",
      operator: "Opérateur CC01",
      observation: "Moteur en surrégime dans la montée de Fosse 1.",
      realConsumption: 52.0,
      referenceConsumption: 50.0,
      deviationPercent: 4.0,
      alertLevel: "Normal"
    },
    {
      refuelingCode: "RAV-2026-0003",
      date: todayStr,
      time: "08:00",
      engineId: insertedEngines.find(e => e.code === "LV-0001")?.id || 0,
      engineCode: "LV-0001",
      driverId: 8,
      driverName: "Clément N'Guessan",
      meterReading: 45200,
      previousMeterReading: 44600,
      workDone: 600,
      quantity: 69,
      unitPrice: 855,
      totalAmount: 69 * 855,
      tankId: insertedTanks.find(t => t.code === "Cuve001")?.id || 0,
      tankCode: "Cuve001",
      refuelingPoint: "À la station service",
      service: "Direction & Administration",
      operator: "Bamba Mamadou",
      observation: "Plein effectué avant départ tournée de surveillance.",
      realConsumption: 11.5,
      referenceConsumption: 12.0,
      deviationPercent: -4.2,
      alertLevel: "Normal"
    },
    {
      refuelingCode: "RAV-2026-0004",
      date: todayStr,
      time: "22:45",
      engineId: insertedEngines.find(e => e.code === "EX-1003")?.id || 0,
      engineCode: "EX-1003",
      driverId: 4,
      driverName: "Gervais Kouadio",
      meterReading: 5120,
      previousMeterReading: 5110,
      workDone: 10,
      quantity: 480,
      unitPrice: 855,
      totalAmount: 480 * 855,
      tankId: insertedTanks.find(t => t.code === "CC02")?.id || 0,
      tankCode: "CC02",
      refuelingPoint: "Sur zone (citerne CC01/CC02)",
      service: "Extraction Mine",
      operator: "Équipe de nuit",
      observation: "Saisie nocturne hors horaires réglementaires CML.",
      realConsumption: 48.0,
      referenceConsumption: 45.0,
      deviationPercent: 6.7,
      alertLevel: "Surveillance"
    }
  ]);

  // 8. Alertes de détection automatiques
  await db.insert(alerts).values([
    {
      type: "Surconsommation",
      severity: "Alerte Rouge",
      engineCode: "EX-1002",
      tankCode: "CC01",
      message: "Consommation anormale détectée : 52.0 L/H (+4.0% par rapport à la normale 50.0 L/H). Vérifier injecteurs et charge.",
      status: "Ouverte"
    },
    {
      type: "Hors Plage Horaire",
      severity: "Critique",
      engineCode: "EX-1003",
      tankCode: "CC02",
      message: "RAVITAILLEMENT HORS PLAGE HORAIRE (22:45). La distribution de carburant est autorisée uniquement entre 06h00 et 20h00. Risque de détournement.",
      status: "Investiguée"
    },
    {
      type: "Stock Faible",
      severity: "Surveillance",
      tankCode: "Cuve003",
      message: "Cuve003 – Station service à 36% (18 000 L sur 50 000 L). Planifier une commande fournisseur TotalEnergies / Vivo Energy.",
      status: "Ouverte"
    }
  ]);

  // 9. Journal d'Audit initial
  await db.insert(auditLogs).values([
    { user: "Koné Seydou", role: "Responsable Station", action: "Import Excel CML", entity: "Système", entityId: "INITIAL_LOAD", oldValue: "Fichier Excel Gestion carburant CML.xlsm", newValue: "CML Fuel Management System Pro 2026 (Base SQL)" },
    { user: "Traoré Aminata", role: "Directeur QHSE", action: "Génération Alerte", entity: "Alerte", entityId: "ALT-002", oldValue: "Normal", newValue: "Critique (Hors Plage 22:45)" }
  ]);

  return { seeded: true, message: "Les données du fichier Excel CML ont été importées avec succès." };
}
