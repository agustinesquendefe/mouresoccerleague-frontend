

import React, { useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import CustomTextField from '@/app/(admin)/components/forms/theme-elements/CustomTextField';
import Stack from '@mui/material/Stack';
import { supabase } from '@/lib/supabaseClient';

interface registerType {
    title?: string;
    subtitle?: React.ReactNode;
    subtext?: React.ReactNode;
}

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.id]: e.target.value });
    };


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);
        const { email, password, name } = form;
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (!error && data.user) {
            // Insertar perfil con rol por defecto 'user'
            await supabase
                .from('profiles')
                .insert([{ id: data.user.id, email, name, role: 'user' }]);
        }
        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
        }
    };

    return (
        <>
            {title ? (
                <Typography fontWeight="700" variant="h2" mb={1}>
                    {title}
                </Typography>
            ) : null}

            {subtext}

            <Box component="form" onSubmit={handleRegister}>
                <Stack mb={3}>
                    <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor='name' mb="5px">Name</Typography>
                    <CustomTextField id="name" variant="outlined" fullWidth value={form.name} onChange={handleChange} />

                    <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor='email' mb="5px" mt="25px">Email Address</Typography>
                    <CustomTextField id="email" variant="outlined" fullWidth value={form.email} onChange={handleChange} />

                    <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor='password' mb="5px" mt="25px">Password</Typography>
                    <CustomTextField id="password" type="password" variant="outlined" fullWidth value={form.password} onChange={handleChange} />
                </Stack>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>Registro exitoso. Revisa tu correo para confirmar tu cuenta.</Alert>}
                <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    fullWidth
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Registrando...' : 'Sign Up'}
                </Button>
            </Box>
            {subtitle}
        </>
    );
};

export default AuthRegister;
