import { regenerateFixture } from './fixtureRegeneration';

export async function generateGroupStageMatches(eventId: number): Promise<void> {
  await regenerateFixture(eventId);
}
