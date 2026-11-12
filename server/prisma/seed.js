import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';
import { config } from '../src/config/env.js';

// Helper to generate URL-safe slugs consistently
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const INITIAL_CATEGORIES = [
  {
    name: 'Agriculture',
    description: 'Irrigation practices, soil moisture conservation, and crop water budgeting for sustainable farming.',
  },
  {
    name: 'Rainwater Harvesting',
    description: 'Rooftop catchment, storage design, first-flush diverters, and aquifer recharge methods.',
  },
  {
    name: 'Groundwater',
    description: 'Borewell maintenance, water table monitoring, community recharge pits, and salinity management.',
  },
  {
    name: 'Household Water Conservation',
    description: 'Greywater recycling, aerators, leak detection, and domestic water consumption optimization.',
  },
  {
    name: 'Drip Irrigation',
    description: 'Micro-irrigation layouts, emitter maintenance, fertigation, and high-efficiency water delivery.',
  },
];

async function main() {
  console.log('🌱 Starting JalGyan database seeding...');

  // 1. Seed Categories using upsert to guarantee idempotency
  console.log('📦 Seeding knowledge categories...');
  for (const cat of INITIAL_CATEGORIES) {
    const slug = slugify(cat.name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        name: cat.name,
        slug,
        description: cat.description,
      },
    });
    console.log(`   ✔ Category: "${category.name}" (slug: ${category.slug})`);
  }

  // 2. Seed Initial Administrator Account
  console.log('👤 Seeding default administrator account...');
  const adminEmail = config.adminEmail.toLowerCase().trim();
  const rawAdminPassword = config.adminPassword;

  if (!rawAdminPassword) {
    throw new Error('ADMIN_PASSWORD must be configured in environment variables.');
  }

  // Hash password with salt rounds = 12
  const hashedPassword = await bcrypt.hash(rawAdminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: 'Platform Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      location: 'National Water Conservation Center',
      bio: 'System Administrator responsible for platform moderation, article reviews, and user management.',
    },
    // On repeated seed runs, update profile/role/status but NEVER overwrite existing password
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`   ✔ Admin ready: "${admin.name}" (${admin.email}) [Role: ${admin.role}, Status: ${admin.status}]`);
  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
