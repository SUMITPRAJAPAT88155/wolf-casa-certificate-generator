import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

const PDF_MARGIN = 4; // mm
const CERTIFICATE_WIDTH = 1122;
const CERTIFICATE_HEIGHT = 794;
const PDF_RENDER_SCALE = 4;
const DOWNLOAD_URL_LIFETIME = 60_000;

function certificateElementFrom(el: HTMLElement): HTMLElement {
  if (!el.isConnected) throw new Error('Certificate preview is no longer available. Reopen it and try again.');
  const certificate =
    el.id === 'certificate-view' ? el : el.querySelector<HTMLElement>('#certificate-view');
  if (!certificate) throw new Error('Certificate preview is not available for PDF export.');
  const barcodeCount = certificate.querySelectorAll('.certificate-barcode-wrap svg').length;
  if (barcodeCount !== 0) {
    throw new Error(`Certificate must not contain a barcode; found ${barcodeCount}.`);
  }
  const qrCount = certificate.querySelectorAll('canvas').length;
  if (qrCount !== 1) {
    throw new Error(`Certificate must contain exactly one QR code; found ${qrCount}.`);
  }
  return certificate;
}

async function canvasFromElement(el: HTMLElement, recipientName?: string) {
  const certificate = certificateElementFrom(el);
  await document.fonts.ready;
  await Promise.all(Array.from(certificate.querySelectorAll('img')).map(waitForImage));
  const canvas = await html2canvas(certificate, {
    scale: PDF_RENDER_SCALE,
    width: CERTIFICATE_WIDTH,
    height: CERTIFICATE_HEIGHT,
    windowWidth: CERTIFICATE_WIDTH,
    windowHeight: CERTIFICATE_HEIGHT,
    useCORS: true,
    backgroundColor: '#000000',
    logging: false,
    onclone: (_documentClone, clonedCertificate) => {
      const sourceName = recipientName ?? clonedCertificate.dataset.recipientName;
      if (sourceName !== undefined) {
        const recipient = clonedCertificate.querySelector<HTMLElement>('.certificate-recipient');
        if (!recipient) throw new Error('Certificate recipient name is not available for printing.');
        const displayName = sourceName.trim().toLocaleUpperCase();
        if (!displayName) throw new Error('Enter the student name before printing or downloading the certificate.');
        recipient.textContent = displayName;
        const estimatedWidth = Math.max(displayName.length * 0.72, 1);
        recipient.style.fontSize = `${Math.max(18, Math.min(46, 860 / estimatedWidth))}px`;
      }
      clonedCertificate.style.position = 'relative';
      clonedCertificate.style.top = '0';
      clonedCertificate.style.left = '0';
      clonedCertificate.style.transform = 'none';
      clonedCertificate.style.width = `${CERTIFICATE_WIDTH}px`;
      clonedCertificate.style.height = `${CERTIFICATE_HEIGHT}px`;
    },
  });
  if (canvas.width < CERTIFICATE_WIDTH * PDF_RENDER_SCALE || canvas.height < CERTIFICATE_HEIGHT * PDF_RENDER_SCALE) {
    throw new Error('Certificate image rendering was incomplete. Please try downloading again.');
  }
  return canvas;
}

async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const image = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the certificate image. Please try again.'));
    }, 'image/png');
  });
  const imageBytes = new Uint8Array(await image.arrayBuffer());
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - PDF_MARGIN * 2;
  const availableHeight = pageHeight - PDF_MARGIN * 2;
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  pdf.addImage(
    imageBytes,
    'PNG',
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
    undefined,
    'SLOW'
  );
  const blob = pdf.output('blob');
  if (blob.size === 0) throw new Error('The certificate PDF is empty. Please try again.');
  return blob;
}

async function certificatePdfBlobFromElement(el: HTMLElement, recipientName?: string): Promise<Blob> {
  const canvas = await canvasFromElement(el, recipientName);
  return canvasToPdfBlob(canvas);
}

function safeFileName(fileName: string, extension: 'pdf' | 'zip'): string {
  const normalized = fileName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[. ]+$/g, '')
    .slice(0, 180)
    .replace(new RegExp(`\\.${extension}$`, 'i'), '');
  return `${normalized || 'certificate'}.${extension}`;
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  if (blob.size === 0) throw new Error('The generated download file is empty. Please try again.');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME);
  }
}

export async function downloadCertificatePdf(el: HTMLElement, fileName: string, recipientName?: string) {
  const blob = await certificatePdfBlobFromElement(el, recipientName);
  triggerBlobDownload(blob, safeFileName(fileName, 'pdf'));
}

export async function certificatePdfBlob(el: HTMLElement): Promise<Blob> {
  return certificatePdfBlobFromElement(el);
}

export async function downloadCertificatesZip(
  items: { element: HTMLElement; fileName: string }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void
) {
  const zip = new JSZip();
  for (let i = 0; i < items.length; i++) {
    const blob = await certificatePdfBlob(items[i].element);
    zip.file(`${items[i].fileName}.pdf`, blob);
    onProgress?.(i + 1, items.length);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(content, safeFileName(zipName, 'zip'));
}

async function waitForImage(img: HTMLImageElement): Promise<void> {
  if (!img.complete) {
    await new Promise<void>((resolve, reject) => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => reject(new Error(`Could not load certificate image: ${img.src}`)), {
        once: true,
      });
    });
  }
  if (img.naturalWidth === 0) {
    throw new Error(`Could not load certificate image: ${img.src}`);
  }
  try {
    await img.decode();
  } catch {
    if (!img.complete || img.naturalWidth === 0) {
      throw new Error(`Could not decode certificate image: ${img.src}`);
    }
  }
}

export async function printElement(el: HTMLElement, recipientName?: string): Promise<void> {
  const printWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!printWindow) throw new Error('Popup blocked. Please allow popups to print.');

  try {
    if (!el.isConnected) throw new Error('Certificate preview is not available for printing.');
    const certificate = certificateElementFrom(el);
    const canvas = await canvasFromElement(certificate, recipientName);
    const img = printWindow.document.createElement('img');
    img.alt = 'Certificate';
    img.src = canvas.toDataURL('image/png');

    printWindow.document.write(`<!doctype html><html><head><title>Print Certificate</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        html, body { width: 297mm; height: 210mm; margin: 0; padding: 0; overflow: hidden; }
        body { background: #050505; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .certificate-print-root { display: flex; width: 297mm; height: 210mm; align-items: center; justify-content: center; overflow: hidden; }
        .certificate-print-root img { display: block; width: auto; height: auto; max-width: 289mm; max-height: 202mm; object-fit: contain; }
        @media print {
          html, body { width: 297mm; height: 210mm; margin: 0; overflow: hidden; }
          body * { visibility: hidden; }
          .certificate-print-root, .certificate-print-root * { visibility: visible; }
          .certificate-print-root { position: fixed; top: 0; left: 0; }
          .certificate-print-root img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style></head><body><main class="certificate-print-root"></main></body></html>`);
    printWindow.document.close();
    const printRoot = printWindow.document.querySelector<HTMLElement>('.certificate-print-root');
    if (!printRoot) throw new Error('Certificate print container could not be created.');
    printRoot.appendChild(img);
    await waitForImage(img);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
