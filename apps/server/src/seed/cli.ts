import { config } from '../config';
import { connectDatabase } from '../db/connect';
import { seedDatabase } from './seed';

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const database = await connectDatabase(config.mongoUri);
  try {
    if (database.inMemory) {
      throw new Error(
        'The seed command needs a persistent MongoDB shared with the app. ' +
          'Set MONGODB_URI first. To reset the temporary development database, restart the app instead.',
      );
    }
    const result = await seedDatabase({ force });
    if (result.skipped) {
      console.log(
        'Database already seeded — nothing to do. Use `npm run seed -- --force` to reset.',
      );
    } else {
      console.log(
        `Seeded ${result.users} users, ${result.channels} channels, ${result.messages} messages.`,
      );
    }
  } finally {
    await database.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
