'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { Event, EventFormData } from '@/models/event';
import EventDialog from '@/app/(admin)/components/events/EventDialog';
import EventsTable from '@/app/(admin)/components/events/EventsTable';
import {
  createEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from '@/services/events';
import { useRouter } from 'next/navigation';

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        loadEvents();
    }, []);

    const showToast = (message: string, severity: 'success' | 'error') => {
        setToast({ open: true, message, severity });
    };

    const loadEvents = async () => {
        try {
        setLoading(true);
        const data = await getEvents();
        setEvents(data);
        } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to load events';
        showToast(message, 'error');
        } finally {
        setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setDialogMode('create');
        setSelectedEvent(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (event: Event) => {
        setDialogMode('edit');
        setSelectedEvent(event);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        if (saving) return;
        setDialogOpen(false);
        setSelectedEvent(null);
    };

    const handleSubmit = async (values: EventFormData) => {
        try {
        setSaving(true);

        if (dialogMode === 'create') {
            const created = await createEvent(values);
            setEvents((prev) => [created, ...prev]);
            showToast('Event created successfully', 'success');
        } else if (selectedEvent) {
            const updated = await updateEvent(selectedEvent.id, values);
            setEvents((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
            );
            showToast('Event updated successfully', 'success');
        }

        setDialogOpen(false);
        setSelectedEvent(null);
        } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to save event';
        showToast(message, 'error');
        } finally {
        setSaving(false);
        }
    };

    const handleDelete = async (event: Event) => {
        const confirmed = window.confirm(
        `Are you sure you want to delete "${event.name ?? event.key}"?`
        );

        if (!confirmed) return;

        try {
            await deleteEvent(event.id);
            setEvents((prev) => prev.filter((item) => item.id !== event.id));
            showToast('Event deleted successfully', 'success');
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to delete event';
            showToast(message, 'error');
        }
    };

    return (
        <Box p={3}>
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
            >
                <Box>
                <Typography variant="h4" fontWeight={700}>
                    Events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage all competitions and categories
                </Typography>
                </Box>

                <Button variant="contained" onClick={handleOpenCreate}>
                Create Event
                </Button>
            </Stack>

            {loading ? (
                <Stack alignItems="center" py={6}>
                <CircularProgress />
                </Stack>
            ) : events.length === 0 ? (
                <Alert severity="info">No events found.</Alert>
            ) : (
                <EventsTable
                    events={events}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onView={(event) => router.push(`/events/${event.id}`)}
                />
            )}

            <EventDialog
                open={dialogOpen}
                mode={dialogMode}
                event={selectedEvent}
                loading={saving}
                onClose={handleCloseDialog}
                onSubmit={handleSubmit}
            />

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                severity={toast.severity}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                variant="filled"
                >
                {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}