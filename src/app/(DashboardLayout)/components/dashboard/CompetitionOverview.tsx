'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from '@mui/material/styles';
import {
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import BlankCard from '@/app/(DashboardLayout)/components/shared/BlankCard';
import {
  getCompetitionOverview,
  type CompetitionOverviewRow,
} from '@/services/dashboard';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function CompetitionOverview() {
  const [rows, setRows] = useState<CompetitionOverviewRow[]>([]);
  const theme = useTheme();

  useEffect(() => {
    getCompetitionOverview().then(setRows).catch(console.error);
  }, []);

  const categories = rows.map((row) => row.label);
  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: false,
      toolbar: { show: false },
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '50%',
      },
    },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
    xaxis: {
      categories,
    },
    colors: [theme.palette.info.main, theme.palette.success.main],
    grid: {
      borderColor: '#ebf1f6',
    },
  };

  const chartSeries = [
    { name: 'Scheduled', data: rows.map((row) => row.scheduled) },
    { name: 'Played', data: rows.map((row) => row.played) },
  ];

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Competition Overview
        </Typography>

        <Chart type="bar" options={chartOptions} series={chartSeries} height={260} />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Round</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell>Played</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.scheduled}</TableCell>
                <TableCell>{row.played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </BlankCard>
  );
}
