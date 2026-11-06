import PageContainer from '@/app/(admin)/components/container/PageContainer';
import ScoresSection from '@/app/(admin)/components/matches/ScoresSection';

export default function ScoresPage() {
  return (
    <PageContainer title="Scores" description="Update scores and review game cards">
      <ScoresSection />
    </PageContainer>
  );
}
