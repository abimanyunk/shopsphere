import { config } from 'dotenv';
import { z } from 'zod';
import { loadEnvironment } from '../src/config/env.js';
import { createPrismaClient } from '../src/database/prisma.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { UserRepository } from '../src/modules/users/user.repository.js';

config({ path: new URL('../../.env', import.meta.url) });

const adminSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']),
  DEV_ADMIN_EMAIL: z.email().transform((value) => value.trim().toLowerCase()),
  DEV_ADMIN_PASSWORD: z.string().min(12).max(128),
});

const environment = loadEnvironment();
const admin = adminSchema.parse(process.env);
const prisma = createPrismaClient(environment.DATABASE_URL);

try {
  const passwordHash = await new PasswordService().hash(admin.DEV_ADMIN_PASSWORD);
  const user = await new UserRepository(prisma).upsertAdmin({
    email: admin.DEV_ADMIN_EMAIL,
    passwordHash,
    firstName: 'Development',
    lastName: 'Administrator',
  });
  console.log(`Development admin prepared: ${user.email}`);

  const categoryDefinitions = [
    { name: 'Electronics', slug: 'electronics', description: 'Devices and everyday technology.' },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Practical essentials for the home.',
    },
    { name: 'Books', slug: 'books', description: 'Books for learning and leisure.' },
  ];
  const categories = new Map<string, string>();
  for (const definition of categoryDefinitions) {
    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      create: definition,
      update: { ...definition, isActive: true },
    });
    categories.set(definition.slug, category.id);
  }

  const productDefinitions = [
    {
      sku: 'ELEC-HEADPHONES-001',
      name: 'Wireless Over-Ear Headphones',
      description: 'Comfortable wireless headphones with active noise cancellation.',
      price: '5999.00',
      stockQuantity: 24,
      categorySlug: 'electronics',
      imageUrl: 'https://placehold.co/800x600/png?text=Wireless+Headphones',
    },
    {
      sku: 'ELEC-KEYBOARD-001',
      name: 'Mechanical Keyboard',
      description: 'Compact mechanical keyboard with tactile switches and USB-C connectivity.',
      price: '3499.00',
      stockQuantity: 18,
      categorySlug: 'electronics',
      imageUrl: 'https://placehold.co/800x600/png?text=Mechanical+Keyboard',
    },
    {
      sku: 'HOME-BLENDER-001',
      name: 'Compact Countertop Blender',
      description: 'A dependable blender for smoothies, sauces, and everyday preparation.',
      price: '2499.00',
      stockQuantity: 11,
      categorySlug: 'home-kitchen',
      imageUrl: 'https://placehold.co/800x600/png?text=Countertop+Blender',
    },
    {
      sku: 'HOME-BOTTLE-001',
      name: 'Insulated Steel Bottle',
      description: 'Double-wall insulated bottle designed to keep drinks at temperature.',
      price: '899.00',
      stockQuantity: 0,
      categorySlug: 'home-kitchen',
      imageUrl: 'https://placehold.co/800x600/png?text=Steel+Bottle',
    },
    {
      sku: 'BOOK-DEVOPS-001',
      name: 'Practical DevOps Foundations',
      description: 'A hands-on introduction to delivery pipelines and reliable operations.',
      price: '1299.00',
      stockQuantity: 40,
      categorySlug: 'books',
      imageUrl: 'https://placehold.co/800x600/png?text=DevOps+Foundations',
    },
    {
      sku: 'BOOK-SYSTEMS-001',
      name: 'Designing Maintainable Systems',
      description: 'Patterns and trade-offs for building software that can evolve safely.',
      price: '1599.00',
      stockQuantity: 32,
      categorySlug: 'books',
      imageUrl: 'https://placehold.co/800x600/png?text=Maintainable+Systems',
    },
  ];
  for (const definition of productDefinitions) {
    const { categorySlug, ...product } = definition;
    const categoryId = categories.get(categorySlug);
    if (!categoryId) throw new Error(`Missing seed category: ${categorySlug}`);
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: { ...product, categoryId },
      update: { ...product, categoryId, isActive: true },
    });
  }
  console.log(
    `Catalogue prepared: ${categories.size} categories, ${productDefinitions.length} products`,
  );
} finally {
  await prisma.$disconnect();
}
