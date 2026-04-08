'use client';

import {
  Avatar,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { Profile } from '@/models/profile';

const ROLE_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  admin: 'error',
  editor: 'warning',
  viewer: 'default',
};

type UsersTableProps = {
  profiles: Profile[];
  currentUserId: string | undefined;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
};

export default function UsersTable({ profiles, currentUserId, onEdit, onDelete }: UsersTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Member Since</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {profiles.map((profile) => {
            const isCurrentUser = profile.id === currentUserId;
            const initials = (profile.full_name ?? profile.email ?? '?')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <TableRow key={profile.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      src={profile.avatar_url ?? undefined}
                      sx={{ width: 36, height: 36, fontSize: 13 }}
                    >
                      {initials}
                    </Avatar>
                    <span>
                      {profile.full_name ?? '—'}
                      {isCurrentUser && (
                        <Chip label="You" size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                    </span>
                  </Stack>
                </TableCell>
                <TableCell>{profile.email ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={profile.role}
                    size="small"
                    color={ROLE_COLOR[profile.role] ?? 'default'}
                  />
                </TableCell>
                <TableCell>
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString('es-ES')
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" size="small" onClick={() => onEdit(profile)}>
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={isCurrentUser}
                      onClick={() => onDelete(profile)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
