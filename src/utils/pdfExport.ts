import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Participant, Quiz } from '../types/quiz';

export interface PDFExportOptions {
  quizTitle: string;
  rankings: Participant[];
  isFirstAttemptOnly: boolean;
}

export const exportRankingsToPDF = ({
  quizTitle,
  rankings,
  isFirstAttemptOnly,
}: PDFExportOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  doc.setFillColor(33, 9, 78); // Deep kahoot purple
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(255, 166, 2); // Kahoot yellow
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE OFICIAL DE RANKING', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(230, 230, 230);
  doc.text(`Cuestionario: ${quizTitle}`, 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Fecha de emisión: ${today}`, 14, 34);

  // Filter Badge info on top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 215, 0);
  const filterText = isFirstAttemptOnly
    ? 'Modo: Anti-trampas (Solo 1er Intento)'
    : 'Modo: Todos los intentos registrados';
  doc.text(filterText, pageWidth - 14, 20, { align: 'right' });

  // Summary Metrics Section
  const totalPlayers = rankings.length;
  const avgScore = totalPlayers > 0
    ? Math.round(rankings.reduce((acc, p) => acc + (p.totalScore || 0), 0) / totalPlayers)
    : 0;
  const topScore = totalPlayers > 0 ? (rankings[0]?.totalScore || 0) : 0;
  const topScorerName = totalPlayers > 0 ? (rankings[0]?.nickname || 'N/A') : 'N/A';

  let startY = 54;
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, startY, pageWidth - 28, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 70);
  doc.text('RESUMEN GENERAL', 20, startY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  doc.text(`Participantes evaluados: ${totalPlayers}`, 20, startY + 16);
  doc.text(`Promedio de puntaje: ${avgScore.toLocaleString()} pts`, 85, startY + 16);
  doc.text(`1er Lugar: ${topScorerName} (${topScore.toLocaleString()} pts)`, 145, startY + 16);

  // Table Data
  const tableRows = rankings.map((p, index) => {
    const position = index === 0 ? '1 (Oro)' : index === 1 ? '2 (Plata)' : index === 2 ? '3 (Bronce)' : `#${index + 1}`;
    const dateFormatted = p.completedAt
      ? new Date(p.completedAt).toLocaleString('es-MX', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '-';

    return [
      position,
      p.nickname || 'Sin nombre',
      (p.totalScore || 0).toLocaleString(),
      `${p.correctAnswersCount || 0} / ${p.totalQuestionsCount || 8}`,
      `${p.accuracyPercentage || 0}%`,
      p.maxStreak ? `${p.maxStreak} 🔥` : '0',
      dateFormatted,
    ];
  });

  autoTable(doc, {
    startY: startY + 28,
    head: [['Posición', 'Participante', 'Puntaje', 'Aciertos', 'Precisión', 'Racha', 'Fecha Primer Intento']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [70, 23, 143], // Kahoot purple
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 46 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 38 },
    },
    alternateRowStyles: {
      fillColor: [248, 248, 252],
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${data.pageNumber} de ${pageNumber} - Kahoot Examen Pro (Cinépolis)`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  const fileName = `Reporte_Ranking_${quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
