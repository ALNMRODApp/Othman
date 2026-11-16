import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  MAX_LOGO_DATA_URL_CHARS,
  validateUploadedImageMeta,
} from './security';

export async function exportInvoiceElementToPdf(
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
  } else {
    let heightLeft = imgHeight;
    let position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }
  }

  const safeName = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || 'invoice';
  pdf.save(`CXT-othman-${safeName}.pdf`);
}

export function compressLogoFile(file: File, maxDim: number = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const validationErr = validateUploadedImageMeta({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (validationErr) {
      reject(new Error(validationErr));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        if (compressed.length > MAX_LOGO_DATA_URL_CHARS) {
          reject(new Error('حجم الصورة بعد الضغط ما زال كبيراً. يرجى اختيار صورة أصغر.'));
          return;
        }
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
