import EventDetailClient from '@/app/(admin)/components/events/EventDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) {
    return <div style={{ padding: 20 }}>Invalid event id.</div>;
  }

  return <EventDetailClient eventId={eventId} />;
}