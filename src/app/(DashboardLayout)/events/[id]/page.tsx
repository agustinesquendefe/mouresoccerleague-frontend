import EventTeamsSection from "../../components/events/EventTeamsSection";

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
    <div style={{ padding: 20 }}>
      <h2>Event Detail</h2>
      <EventTeamsSection eventId={eventId} />
    </div>
  );
}