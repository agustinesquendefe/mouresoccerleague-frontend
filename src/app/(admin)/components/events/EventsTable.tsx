'use client';

import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { Event } from '@/models/event';
import type { EventListRow } from '@/services/events';
import { formatStoredDate } from '@/utils/dateOnly';
import { getWeekdayLabel } from '@/utils/weekdays';

type EventsTableProps = {
  events: EventListRow[];
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
};

export default function EventsTable({
  events,
  count,
  page,
  rowsPerPage,
  onPageChange,
  onEdit,
  onDelete,
  onView,
}: EventsTableProps) {
  return (
    <Paper>
      <TableContainer>
        <Table sx={{ minWidth: 1150 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Season</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Match Type</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>Event day</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11}>
                <Typography variant="h6" fontWeight={600}>No events found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your search or filters, or create a new event.
                </Typography>
              </TableCell>
            </TableRow>
          ) : events.map((event) => (
            <TableRow key={event.id} hover>
              <TableCell>{event.id}</TableCell>
              <TableCell>
                <Button variant="text" onClick={() => onView(event)}>
                  {event.name ?? '-'}
                </Button>
              </TableCell>
              <TableCell>{event.season_name ?? event.season_id}</TableCell>
              <TableCell>{event.category_name ?? '-'}</TableCell>
              <TableCell>
                <Chip label={event.format_type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>{event.match_format ?? '-'}</TableCell>
              <TableCell>${Number(event.event_price ?? event.membership_price ?? 0).toFixed(2)}</TableCell>
              <TableCell>{formatStoredDate(event.start_date)}</TableCell>
              <TableCell>{getWeekdayLabel(event.match_day_of_week)}</TableCell>
              <TableCell>
                <Chip label={event.status ?? 'draft'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(event)}>
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(event)}
                  >
                    Delete
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
      />
    </Paper>
  );
}
