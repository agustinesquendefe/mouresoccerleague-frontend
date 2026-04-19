"use client";

import React, { useEffect, useState } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent, CircularProgress, Stack as MuiStack, DialogContentText } from '@mui/material';
import { LegalDocument } from '@/models/legalDocument';
import { supabase } from '@/lib/supabaseClient';
import { getLegalDocuments, createLegalDocument, updateLegalDocument, deleteLegalDocument } from '@/services/legalDocuments';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PageContainer from '../../components/container/PageContainer';
import Box from 'node_modules/@mui/system/esm/Box/Box';
import Stack from 'node_modules/@mui/system/esm/Stack/Stack';
import Link from 'next/dist/client/link';

const defaultForm: Partial<LegalDocument> = {
  name: '',
  description: '',
  language: 'en',
  type: 'tutor',
  version: '',
  date: '',
  file: undefined,
};

const LegalDocumentsPage = () => {
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [downloadUrls, setDownloadUrls] = useState<{ [key: string]: string }>({});
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Partial<LegalDocument>>(defaultForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<LegalDocument | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        const docs = await getLegalDocuments();
        setDocuments(docs);

        const urls: { [key: string]: string } = {};

        for (const doc of docs) {
            if (doc.file_url) {
                const { data, error } = await supabase.storage
                    .from('legal-documents')
                    .createSignedUrl(doc.file_url, 60 * 10); // 10 minutos

                if (!error && data?.signedUrl) {
                    urls[doc.id] = data.signedUrl;
                } else {
                    urls[doc.id] = '';
                }
            }
        }

        setDownloadUrls(urls);
        setLoading(false);
    };

    const handleDeleteClick = (doc: LegalDocument) => {
        setDocToDelete(doc);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (docToDelete) {
            await deleteLegalDocument(docToDelete.id);
            await fetchDocuments();
            setDocToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    const handleCancelDelete = () => {
        setDocToDelete(null);
        setDeleteDialogOpen(false);
    };


    const handleOpen = (doc?: LegalDocument) => {
        if (doc) {
        setForm(doc);
        setEditId(doc.id);
        } else {
        setForm(defaultForm);
        setEditId(null);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setForm(defaultForm);
        setEditId(null);
    };



    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setForm((prev: any) => ({
        ...prev,
        [name]: type === 'file' ? (e.target as HTMLInputElement).files?.[0] : value
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name as string]: value }));
    };

    const handleDownload = async (url: string, filename: string) => {
        const response = await fetch(url);
        const blob = await response.blob();

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const handleSubmit = async () => {
        setSubmitLoading(true);
        try {
        const formData = new FormData();
        formData.append('name', form.name || '');
        formData.append('description', form.description || '');
        formData.append('language', form.language || '');
        formData.append('type', form.type || '');
        formData.append('version', form.version || '');
        formData.append('date', form.date || '');
        if (form.file) {
            formData.append('file', form.file);
        }
        if (editId) {
            await updateLegalDocument(editId, formData);
        } else {
            await createLegalDocument(formData);
        }
        await fetchDocuments();
        handleClose();
        } finally {
        setSubmitLoading(false);
        }
    };

    return (
        <PageContainer title='Rules and Permissions' description=''>
            <Box p={0}>
                <Stack 
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={3}
                >
                    <Box>
                        <Typography variant="h4" fontWeight={700}>
                            Rules & Permissions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage legal documents for tutors and participants
                        </Typography>
                    </Box>

                    <Button variant="contained" color="primary" onClick={() => handleOpen()} sx={{ mb: 2 }}>
                        Add Legal Document
                    </Button>
                </Stack>

                {loading ? (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress />
                    </Stack>
                ) : (
                documents.length === 0 ? (
                    <Stack alignItems="center" py={6}>
                    <Typography color="text.secondary">No legal documents found.</Typography>
                    </Stack>
                ) : (
                    <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                        <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Description</TableCell>
                        <TableCell>Language</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell align="right">Actions</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell>{doc.name}</TableCell>
                            <TableCell style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.description}</TableCell>
                            <TableCell>{doc.language}</TableCell>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>{doc.version}</TableCell>
                            <TableCell>
                                {downloadUrls[doc.id] ? (
                                    <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() =>
                                        handleDownload(
                                        downloadUrls[doc.id],
                                        doc.name || 'document.pdf'
                                        )
                                    }
                                    >
                                    Download
                                    </Button>
                                ) : (
                                    'No file'
                                )}
                            </TableCell>
                            <TableCell align="right">
                                <MuiStack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" size="small" onClick={() => handleOpen(doc)}>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteClick(doc)}
                                    >
                                        Delete
                                    </Button>
                                </MuiStack>
                            </TableCell>
                        </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </TableContainer>
                )
                )}

                <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
                    <DialogTitle>
                        Confirm Delete
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                        Are you sure you want to delete this document?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete}>Cancel</Button>
                        <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Delete
                        </Button>
                    </DialogActions>
                </Dialog>
                
                <Dialog open={open} onClose={handleClose}>
                    <DialogTitle>
                        {editId ? 'Edit Legal Document' : 'Add Legal Document'}
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
                    <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
                    <TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth />
                    <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select name="language" value={form.language} label="Language" onChange={handleSelectChange}>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select name="type" value={form.type} label="Type" onChange={handleSelectChange}>
                        <MenuItem value="tutor">Tutor</MenuItem>
                        <MenuItem value="participant">Participant</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField label="Version" name="version" value={form.version} onChange={handleChange} fullWidth />
                    <TextField
                        label="Date"
                        name="date"
                        type="date"
                        value={form.date || ''}
                        onChange={handleChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ mt: 1 }}
                    >
                        {form.file ? form.file.name : 'Upload PDF'}
                        <input
                        type="file"
                        accept="application/pdf"
                        hidden
                        name="file"
                        onChange={handleChange}
                        />
                    </Button>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={submitLoading} startIcon={submitLoading ? <CircularProgress size={20} /> : null}>
                        {submitLoading ? (editId ? 'Updating...' : 'Adding...') : (editId ? 'Update' : 'Add')}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </PageContainer>
    );
};

export default LegalDocumentsPage;
