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
import EventsFilters, {
  type EventFilters,
} from '@/app/(admin)/components/events/EventsFilters';
import EventsTable from '@/app/(admin)/components/events/EventsTable';
import type { Category } from '@/models/category';
import type { Season } from '@/models/season';
import { getCategories } from '@/services/categories';
import {
  createEvent,
  deleteEvent,
  getEventsPaginated,
  type EventListRow,
  updateEvent,
} from '@/services/events';
import { getSeasons } from '@/services/seasons';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 25;

const INITIAL_FILTERS: EventFilters = {
    search: '',
    categoryId: null,
    seasonId: null,
    dayOfWeek: null,
    status: null,
    formatType: null,
};

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<EventListRow[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<EventFilters>(INITIAL_FILTERS);
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
    }, [page, filters]);

    useEffect(() => {
        Promise.all([getCategories(), getSeasons()])
            .then(([categoryRows, seasonRows]) => {
                setCategories(categoryRows);
                setSeasons(seasonRows);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Failed to load filters';
                showToast(message, 'error');
            });
    }, []);

    const showToast = (message: string, severity: 'success' | 'error') => {
        setToast({ open: true, message, severity });
    };

    const loadEvents = async () => {
        try {
        setLoading(true);
        const result = await getEventsPaginated({
            page,
            pageSize: PAGE_SIZE,
            ...filters,
        });
        setEvents(result.rows);
        setCount(result.count);
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
            await createEvent(values);
            await loadEvents();
            showToast('Event created successfully', 'success');
        } else if (selectedEvent) {
            await updateEvent(selectedEvent.id, values, selectedEvent);
            await loadEvents();
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
            if (events.length === 1 && page > 0) {
                setPage((currentPage) => Math.max(currentPage - 1, 0));
            } else {
                await loadEvents();
            }
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

            <Stack mb={3}>
                <EventsFilters
                    value={filters}
                    categories={categories}
                    seasons={seasons}
                    onChange={(nextFilters) => {
                        setFilters(nextFilters);
                        setPage(0);
                    }}
                />
            </Stack>

            {loading ? (
                <Stack alignItems="center" py={6}>
                <CircularProgress />
                </Stack>
            ) : (
                <EventsTable
                    events={events}
                    count={count}
                    page={page}
                    rowsPerPage={PAGE_SIZE}
                    onPageChange={setPage}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onView={(event) => router.push(`/admin/events/${event.id}`)}
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
