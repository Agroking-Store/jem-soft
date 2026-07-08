import { PrismaClient } from '@prisma/client';
import { runSeeders } from './seeds/index';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Run all seeders from the /seeds directory
  await runSeeders(prisma);

  console.log(`Seeding finished.`);

}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
