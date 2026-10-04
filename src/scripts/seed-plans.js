import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    id: 'free',
    name: 'Free',
    storageLimit: BigInt(5 * 1024 * 1024 * 1024), // 5GB
    price: 0,
    features: {
      maxFileSize: '100MB',
      shareLinks: true,
      support: 'community',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    storageLimit: BigInt(100 * 1024 * 1024 * 1024), // 100GB
    price: 9.99,
    features: {
      maxFileSize: '5GB',
      shareLinks: true,
      passwordProtection: true,
      support: 'email',
    },
  },
  {
    id: 'business',
    name: 'Business',
    storageLimit: BigInt(1024 * 1024 * 1024 * 1024), // 1TB
    price: 29.99,
    features: {
      maxFileSize: 'unlimited',
      shareLinks: true,
      passwordProtection: true,
      customExpiry: true,
      support: 'priority',
    },
  },
];

async function seed() {
  console.log('Seeding plans...');
  
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`Created/updated plan: ${plan.name}`);
  }
  
  console.log('Seeding complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
