'use client';

import { useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { uploadImage } from '@/services/storage/uploadImage';

export default function LogoDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');

  const processFile = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos PNG o SVG.');
      return;
    }

    setFileName(file.name);

    // aquí haces tu upload
    await uploadImage({
      bucket: 'moure-premier',
      path: `app-settings/${file.name}`,
      file,
    });
    // console.log('Archivo listo para subir:', file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);

    // limpia el input para permitir volver a seleccionar el mismo archivo
    e.target.value = '';
  };

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      sx={{
        border: '2px dashed #aaa',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: '#fafafa',
      }}
    >
      <Typography variant="body1" mb={1}>
        Arrastra tu logo aquí o haz clic en el botón para seleccionar
      </Typography>

      <Button
        variant="outlined"
        component="span"
        onClick={() => inputRef.current?.click()}
        sx={{ mt: 1 }}
      >
        Seleccionar archivo
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.svg,image/png,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {fileName ? (
        <Typography variant="body2" sx={{ mt: 2 }}>
          Archivo seleccionado: {fileName}
        </Typography>
      ) : null}
    </Box>
  );
}