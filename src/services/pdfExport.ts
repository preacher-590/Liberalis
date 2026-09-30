/**
 * Service d'export PDF — Feat 8
 *
 * Capture un élément HTML en haute résolution (html2canvas)
 * et génère un fichier PDF A4 téléchargeable (jsPDF).
 *
 * Les librairies sont importées dynamiquement pour ne pas
 * alourdir le bundle initial (lazy loading).
 */

/**
 * Exporte un élément HTML en fichier PDF A4 téléchargeable.
 *
 * @param elementId - L'ID HTML de l'élément à capturer (ex: "invoice-preview")
 * @param fileName  - Le nom du fichier PDF sans extension (ex: "F-2026-0091")
 *
 * @example
 *   await exportToPDF('invoice-preview', invoice.invoice_number);
 */
export async function exportToPDF(elementId: string, fileName: string): Promise<void> {
  // Import dynamique pour charger ces librairies lourdes uniquement à la demande
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`[exportToPDF] Élément #${elementId} introuvable dans le DOM.`);
  }

  // Capture en canvas à échelle x2 pour un rendu net et lisible sur papier
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,               // Permet les images cross-origin (logos, etc.)
    backgroundColor: '#ffffff',  // Fond blanc forcé pour le PDF
    logging: false,              // Désactive les logs verbeux de html2canvas
  });

  const imgData = canvas.toDataURL('image/png');

  // Création du PDF en format A4 portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Largeur A4 = 210mm, on adapte la hauteur en conservant le ratio du canvas
  const pdfWidth = 210;
  const pageHeight = 297;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  // Contenu plus haut qu'une page A4 : on redessine l'image décalée
  // vers le haut sur chaque page suivante pour la découper proprement.
  let heightLeft = pdfHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${fileName}.pdf`);
}
