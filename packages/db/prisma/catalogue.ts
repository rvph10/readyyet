import type { PrismaClient } from "../generated/client/index.js";

/**
 * The status and business-type catalogue described in
 * docs/domain/status-catalogue.md. That doc is the source of truth, if
 * this drifts from it, the doc is right and this is wrong. Shared between
 * prisma/seed.ts and the test suite, so tests exercise the real seed
 * logic instead of fabricated data.
 */

export const SYSTEM_STATUSES = [
  { code: "RECEIVED", en: "Received", fr: "Reçu" },
  { code: "READY", en: "Ready", fr: "Prêt" },
  { code: "COMPLETED", en: "Completed", fr: "Terminé" },
  { code: "CANCELLED", en: "Cancelled", fr: "Annulé" },
  { code: "REJECTED", en: "Rejected", fr: "Refusé" },
] as const;

export const OPERATIONAL_STATUSES = [
  { code: "INSPECTING", en: "Inspecting", fr: "Inspection" },
  { code: "DIAGNOSING", en: "Diagnosing", fr: "Diagnostic" },
  { code: "QUOTE_PREPARED", en: "Quote prepared", fr: "Devis prêt" },
  { code: "AWAITING_APPROVAL", en: "Awaiting approval", fr: "En attente d'approbation" },
  { code: "APPROVED", en: "Approved", fr: "Approuvé" },
  { code: "AWAITING_PARTS", en: "Awaiting parts", fr: "En attente de pièces" },
  { code: "PARTS_ORDERED", en: "Parts ordered", fr: "Pièces commandées" },
  { code: "BACKORDERED", en: "Backordered", fr: "Rupture de stock fournisseur" },
  { code: "AWAITING_CLIENT_INFO", en: "Awaiting client info", fr: "En attente d'informations client" },
  { code: "ON_HOLD", en: "On hold", fr: "En pause" },
  { code: "IN_PROGRESS", en: "In progress", fr: "En cours" },
  { code: "DISASSEMBLY", en: "Disassembly", fr: "Démontage" },
  { code: "CLEANING", en: "Cleaning", fr: "Nettoyage" },
  { code: "REPAIRING", en: "Repairing", fr: "Réparation" },
  { code: "REPLACING_PARTS", en: "Replacing parts", fr: "Remplacement de pièces" },
  { code: "REASSEMBLY", en: "Reassembly", fr: "Remontage" },
  { code: "PAINTING", en: "Painting", fr: "Peinture" },
  { code: "POLISHING", en: "Polishing", fr: "Polissage" },
  { code: "CALIBRATING", en: "Calibrating", fr: "Étalonnage" },
  { code: "SOFTWARE_UPDATE", en: "Software update", fr: "Mise à jour logicielle" },
  { code: "ALTERATION", en: "Alteration", fr: "Retouche" },
  { code: "FITTING", en: "Fitting", fr: "Essayage" },
  { code: "STAIN_TREATMENT", en: "Stain treatment", fr: "Détachage" },
  { code: "TESTING", en: "Testing", fr: "Test" },
  { code: "QUALITY_CHECK", en: "Quality check", fr: "Contrôle qualité" },
  { code: "PACKAGING", en: "Packaging", fr: "Emballage" },
] as const;

export const BUSINESS_TYPES = [
  { code: "OTHER", en: "Other", fr: "Autre", steps: ["IN_PROGRESS"] },
  { code: "GARAGE", en: "Garage", fr: "Garage", steps: ["DIAGNOSING", "REPAIRING"] },
  {
    code: "ELECTRONICS_REPAIR",
    en: "Electronics repair",
    fr: "Réparateur électronique",
    steps: ["DIAGNOSING", "REPAIRING"],
  },
  { code: "PRESSING", en: "Dry cleaning", fr: "Pressing", steps: ["CLEANING"] },
  {
    code: "LEATHER_GOODS",
    en: "Leather goods repair",
    fr: "Maroquinerie",
    steps: ["DIAGNOSING", "REPAIRING"],
  },
  { code: "SHOE_REPAIR", en: "Shoe repair", fr: "Cordonnerie", steps: ["REPAIRING"] },
  { code: "TAILORING", en: "Tailoring", fr: "Couture / retouche", steps: ["FITTING", "ALTERATION"] },
  {
    code: "WATCH_JEWELRY",
    en: "Watch & jewelry repair",
    fr: "Horlogerie / bijouterie",
    steps: ["DIAGNOSING", "REPAIRING", "QUALITY_CHECK"],
  },
  {
    code: "BICYCLE_REPAIR",
    en: "Bicycle repair",
    fr: "Vélociste",
    steps: ["DIAGNOSING", "REPAIRING"],
  },
  {
    code: "APPLIANCE_REPAIR",
    en: "Appliance repair",
    fr: "Électroménager",
    steps: ["DIAGNOSING", "AWAITING_PARTS", "REPAIRING"],
  },
  { code: "FRAMING", en: "Framing", fr: "Encadrement", steps: ["IN_PROGRESS", "QUALITY_CHECK"] },
] as const;

async function seedStatuses(db: PrismaClient) {
  const statusIds = new Map<string, number>();
  for (const s of [...SYSTEM_STATUSES, ...OPERATIONAL_STATUSES]) {
    const status = await db.status.upsert({
      where: { code: s.code },
      create: { code: s.code },
      update: {},
    });
    statusIds.set(s.code, status.id);
    for (const [locale, label] of [
      ["EN", s.en],
      ["FR", s.fr],
    ] as const) {
      await db.statusTranslation.upsert({
        where: { statusId_locale: { statusId: status.id, locale } },
        create: { statusId: status.id, locale, label },
        update: { label },
      });
    }
  }
  return statusIds;
}

async function seedBusinessTypesAndDefaultWorkflows(db: PrismaClient, statusIds: Map<string, number>) {
  for (const bt of BUSINESS_TYPES) {
    const businessType = await db.businessType.upsert({
      where: { code: bt.code },
      create: { code: bt.code },
      update: {},
    });
    for (const [locale, label] of [
      ["EN", bt.en],
      ["FR", bt.fr],
    ] as const) {
      await db.businessTypeTranslation.upsert({
        where: { businessTypeId_locale: { businessTypeId: businessType.id, locale } },
        create: { businessTypeId: businessType.id, locale, label },
        update: { label },
      });
    }

    const existingDefault = await db.workflow.findFirst({
      where: { businessTypeId: businessType.id, locationId: null, isActive: true },
    });
    if (existingDefault) continue;

    // RECEIVED starts every workflow, READY/COMPLETED close the happy path.
    // CANCELLED/REJECTED are reachable from any state (status transitions
    // are free, position is a suggested display order, not an enforced
    // sequence, see docs/architecture/data-model.md).
    const orderedCodes = ["RECEIVED", ...bt.steps, "READY", "COMPLETED", "CANCELLED", "REJECTED"];

    await db.workflow.create({
      data: {
        businessTypeId: businessType.id,
        name: `${bt.en} (default)`,
        steps: {
          create: orderedCodes.map((code, index) => {
            const statusId = statusIds.get(code);
            if (!statusId) throw new Error(`Unknown status code: ${code}`);
            return { position: index + 1, statusId };
          }),
        },
      },
    });
  }
}

export async function seedCatalogue(db: PrismaClient) {
  const statusIds = await seedStatuses(db);
  await seedBusinessTypesAndDefaultWorkflows(db, statusIds);
}
