import type { AppSettings } from '@/models/appSettings';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type PrintHtmlOptions = {
  title: string;
  subtitle?: string;
  body: string;
  company?: Partial<AppSettings> | null;
};

function formatAddress(company: Partial<AppSettings>) {
  const addressParts = [
    company.address,
    company.address_line_2,
    [company.city, company.state, company.zip_code].filter(Boolean).join(', '),
  ].filter(Boolean);

  return addressParts.join(' | ');
}

function resolvePrintAssetUrl(url: string) {
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

function buildCompanyHeader(company?: Partial<AppSettings> | null) {
  const leagueName = company?.league_name || 'Moure Premier League';
  const logoUrl = resolvePrintAssetUrl(company?.logo_url || '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg');
  const phones = [company?.contact_phone, company?.contact_phone2].filter(Boolean).join(' | ');
  const contactItems = [
    company?.contact_email,
    phones,
    company?.website,
    company ? formatAddress(company) : '1760 S Martin Luther King Jr Dr, Winston-Salem, NC 27107',
  ].filter(Boolean);

  return `
    <header class="company-header">
      <div class="company-brand">
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(leagueName)} logo" />
        <div>
          <div class="company-name">${escapeHtml(leagueName)}</div>
          <div class="company-meta">${contactItems.map(escapeHtml).join('<br />')}</div>
        </div>
      </div>
    </header>
  `;
}

export function printHtml({ title, subtitle, body, company }: PrintHtmlOptions) {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');

  if (!printWindow) {
    window.alert('Unable to open print window. Please allow pop-ups for this site.');
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: letter;
            margin: 0.45in;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            margin: 0;
          }

          .company-header {
            border-bottom: 2px solid #023467;
            margin-bottom: 16px;
            padding-bottom: 12px;
          }

          .company-brand {
            align-items: center;
            display: flex;
            gap: 14px;
          }

          .company-brand img {
            height: 62px;
            max-width: 120px;
            object-fit: contain;
          }

          .company-name {
            color: #023467;
            font-size: 18px;
            font-weight: 800;
          }

          .company-meta {
            color: #4b5563;
            font-size: 10px;
            margin-top: 4px;
          }

          h1 {
            font-size: 20px;
            margin: 0 0 4px;
          }

          h2 {
            font-size: 14px;
            margin: 18px 0 8px;
          }

          .subtitle {
            color: #4b5563;
            font-size: 11px;
            margin-bottom: 16px;
          }

          table {
            border-collapse: collapse;
            page-break-inside: auto;
            width: 100%;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f3f4f6;
            font-weight: 700;
          }

          tr {
            page-break-inside: avoid;
          }

          .round-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .round-card {
            border: 1px solid #d1d5db;
            page-break-inside: avoid;
            padding: 8px;
          }

          .round-card h2 {
            margin-top: 0;
          }

          .section {
            margin-top: 18px;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${buildCompanyHeader(company)}
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
        ${body}
        <script>
          async function waitForImages() {
            const images = Array.from(document.images);
            await Promise.all(images.map((image) => {
              if (image.complete) return Promise.resolve();
              return new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              });
            }));
          }

          window.addEventListener('load', async () => {
            await waitForImages();
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
