import EventTeamsSection from '../../components/events/EventTeamsSection';
import EventFieldsSection from '../../components/events/EventFieldsSection';
import EventMatchesSection from '../../components/matches/EventMatchesSection';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) {
    return <div style={{ padding: 20 }}>Invalid event id.</div>;
  }

  return (
    <div style={{ padding: 20, display: 'grid', gap: 24 }}>
      <h2>Event Detail</h2>

      <EventTeamsSection eventId={eventId} />
      <EventFieldsSection eventId={eventId} />
      <EventMatchesSection eventId={eventId} />
      
    </div>
  );
}