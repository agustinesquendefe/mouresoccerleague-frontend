import { regenerateFixture } from './fixtureRegeneration';

export async function generateRoundRobinMatches(eventId: number): Promise<void> {
  await regenerateFixture(eventId);
}
