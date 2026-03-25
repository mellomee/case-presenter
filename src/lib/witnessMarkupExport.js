import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportElementToPdfBase64(element) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const imageData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);

  const blob = pdf.output('blob');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return String(dataUrl).split(',')[1] || '';
}