import { Prisma, PrismaClient } from '@prisma/client';
import { MENU_CATALOG, MERCHANT_DIRECTORY } from '../lib/catalog';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding BitePass PostgreSQL catalog & stations...');

  for (const merchant of Object.values(MERCHANT_DIRECTORY)) {
    await prisma.merchant.upsert({
      where: { id: merchant.id },
      create: {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
        paypalMerchantId: merchant.paypalMerchantId,
        paymentsReceivable: merchant.paymentsReceivable,
        primaryEmailConfirmed: merchant.primaryEmailConfirmed,
        taxRateBps: merchant.taxRateBps,
        latitude: merchant.latitude,
        longitude: merchant.longitude,
        geofenceRadiusM: merchant.geofenceRadiusM,
      },
      update: {
        name: merchant.name,
        paypalMerchantId: merchant.paypalMerchantId,
        paymentsReceivable: merchant.paymentsReceivable,
        primaryEmailConfirmed: merchant.primaryEmailConfirmed,
        taxRateBps: merchant.taxRateBps,
        latitude: merchant.latitude,
        longitude: merchant.longitude,
        geofenceRadiusM: merchant.geofenceRadiusM,
      },
    });

    const stations = [
      { code: 'Bay #1', kind: 'HIGH_TOP_BAY' as const, priorityOrder: 1 },
      { code: 'Bay #2', kind: 'HIGH_TOP_BAY' as const, priorityOrder: 2 },
      { code: 'Pickup Cubby #A (Grab & Go)', kind: 'SMART_CUBBY' as const, priorityOrder: 3 },
      { code: 'Pickup Cubby #B (Grab & Go)', kind: 'SMART_CUBBY' as const, priorityOrder: 4 },
      { code: 'Pickup Cubby #C (Grab & Go)', kind: 'SMART_CUBBY' as const, priorityOrder: 5 },
      { code: 'Pickup Cubby #D (Grab & Go)', kind: 'SMART_CUBBY' as const, priorityOrder: 6 },
    ];

    for (const s of stations) {
      await prisma.station.upsert({
        where: {
          merchantId_code: {
            merchantId: merchant.id,
            code: s.code,
          },
        },
        create: {
          merchantId: merchant.id,
          code: s.code,
          kind: s.kind,
          priorityOrder: s.priorityOrder,
          health: 'AVAILABLE',
        },
        update: {
          priorityOrder: s.priorityOrder,
        },
      });
    }
  }

  for (const item of MENU_CATALOG) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        merchantId: item.merchantId,
        name: item.name,
        category: item.category,
        basePriceCents: item.basePriceCents,
        prepTimeMinutes: item.prepTimeMinutes,
        dietaryTags: item.dietaryTags,
        allergens: item.allergens,
        calories: item.calories,
        description: item.description,
        imageUrl: item.image,
        quickTweaksJson: item.quickTweaks
          ? (JSON.parse(JSON.stringify(item.quickTweaks)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isAvailable: item.isAvailable,
      },
      update: {
        name: item.name,
        basePriceCents: item.basePriceCents,
        prepTimeMinutes: item.prepTimeMinutes,
        dietaryTags: item.dietaryTags,
        allergens: item.allergens,
        calories: item.calories,
        description: item.description,
        imageUrl: item.image,
        quickTweaksJson: item.quickTweaks
          ? (JSON.parse(JSON.stringify(item.quickTweaks)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  console.log('✔ Seeded 4 merchants, 24 pickup bays/cubbies, and 4 allergen-tagged menu items.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
