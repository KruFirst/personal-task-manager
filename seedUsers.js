const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usersCount = await prisma.user.count();
  let defaultUser;
  
  if (usersCount === 0) {
    console.log('Seeding default family users...');
    defaultUser = await prisma.user.create({
      data: { name: 'พ่อ (Dad)', pin: '1111', avatar: '👨🏻' }
    });
    await prisma.user.create({
      data: { name: 'แม่ (Mom)', pin: '2222', avatar: '👩🏻' }
    });
    await prisma.user.create({
      data: { name: 'ลูกคนโต', pin: '3333', avatar: '👦🏻' }
    });
    await prisma.user.create({
      data: { name: 'ลูกคนเล็ก', pin: '4444', avatar: '👧🏻' }
    });
  } else {
    defaultUser = await prisma.user.findFirst();
  }

  // Assign existing tasks to default user
  const unassignedCount = await prisma.task.count({ where: { userId: null } });
  if (unassignedCount > 0 && defaultUser) {
    console.log(`Assigning ${unassignedCount} existing tasks to ${defaultUser.name}...`);
    await prisma.task.updateMany({
      where: { userId: null },
      data: { userId: defaultUser.id }
    });
  }
  
  console.log('Seed completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
