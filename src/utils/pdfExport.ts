import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Participant, Quiz } from '../types/quiz';
import type { QuestionAnalytics } from '../services/quizService';

export interface PDFExportOptions {
  quizTitle: string;
  rankings: Participant[];
  isFirstAttemptOnly: boolean;
  attemptsCountMap?: Map<string, number>;
}

export const exportRankingsToPDF = ({
  quizTitle,
  rankings,
  isFirstAttemptOnly,
  attemptsCountMap,
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
  const normalize = (name: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

  const tableRows = rankings.map((p, index) => {
    const position = index === 0 ? '1 (Oro)' : index === 1 ? '2 (Plata)' : index === 2 ? '3 (Bronce)' : `#${index + 1}`;
    const dateFormatted = p.completedAt
      ? new Date(p.completedAt).toLocaleString('es-MX', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '-';

    const attempts = attemptsCountMap ? (attemptsCountMap.get(normalize(p.nickname)) || 1) : 1;
    const trampaText = attempts > 1 ? `SI (${attempts} int.)` : 'NO (Limpio)';

    return [
      position,
      p.nickname || 'Sin nombre',
      (p.totalScore || 0).toLocaleString(),
      `${p.correctAnswersCount || 0} / ${p.totalQuestionsCount || 8}`,
      `${p.accuracyPercentage || 0}%`,
      p.maxStreak ? `${p.maxStreak}` : '0',
      trampaText,
      dateFormatted,
    ];
  });

  autoTable(doc, {
    startY: startY + 28,
    head: [['Pos.', 'Participante', 'Puntaje', 'Aciertos', 'Precisión', 'Racha', '¿Trampa?', 'Fecha']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [70, 23, 143], // Kahoot purple
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 44 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 24 },
    },
    alternateRowStyles: {
      fillColor: [248, 248, 252],
    },
    didParseCell: (data) => {
      // Si la columna es '¿Trampa?' (índice 6) y dice 'SI', marcar texto en rojo oscuro
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw && String(data.cell.raw).startsWith('SI')) {
          data.cell.styles.textColor = [190, 30, 30]; // Dark red
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [20, 130, 40]; // Dark green
        }
      }
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

export const exportDiplomaPDF = (
  participant: Participant,
  rank: number,
  quizTitle: string
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297mm x 210mm
  });

  const width = doc.internal.pageSize.getWidth(); // 297
  const height = doc.internal.pageSize.getHeight(); // 210

  // 1. Dark Blue / Navy Cinematic Background Margin
  doc.setFillColor(11, 19, 43); // Cinépolis Deep Navy
  doc.rect(0, 0, width, height, 'F');

  // 2. Inner White Parchment Certificate
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(8, 8, width - 16, height - 16, 4, 4, 'F');

  // 3. Double Gold Border
  doc.setDrawColor(212, 175, 55); // Metallic Gold
  doc.setLineWidth(2.5);
  doc.roundedRect(12, 12, width - 24, height - 24, 3, 3, 'S');

  doc.setLineWidth(0.8);
  doc.roundedRect(14.5, 14.5, width - 29, height - 29, 2, 2, 'S');

  // Corner decorative marks
  doc.setFillColor(212, 175, 55);
  doc.circle(17, 17, 1.8, 'F');
  doc.circle(width - 17, 17, 1.8, 'F');
  doc.circle(17, height - 17, 1.8, 'F');
  doc.circle(width - 17, height - 17, 1.8, 'F');

  // Top Cinépolis Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 19, 43);
  doc.text('CLUB CINEPOLIS MASTER', width / 2, 27, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 130);
  doc.text('PROGRAMA OFICIAL DE EVALUACION Y CAPACITACION CONTINUA', width / 2, 33, { align: 'center' });

  // Divider Accent Line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.7);
  doc.line(width / 2 - 45, 36, width / 2 + 45, 36);

  // Big Award Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(11, 19, 43);
  doc.text('DIPLOMA DE RECONOCIMIENTO', width / 2, 50, { align: 'center' });

  // Rank Badge Text
  const rankTitle =
    rank === 1
      ? '1ER LUGAR DE EXCELENCIA'
      : rank === 2
      ? '2DO LUGAR DESTACADO'
      : rank === 3
      ? '3ER LUGAR HONORIFICO'
      : `POSICION #${rank} EN EL RANKING`;

  const rankBadgeColor: [number, number, number] =
    rank === 1
      ? [212, 175, 55] // Gold
      : rank === 2
      ? [140, 150, 165] // Silver
      : rank === 3
      ? [185, 115, 55] // Bronze
      : [70, 23, 143];

  doc.setFillColor(rankBadgeColor[0], rankBadgeColor[1], rankBadgeColor[2]);
  doc.roundedRect(width / 2 - 50, 55, 100, 8.5, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(rankTitle, width / 2, 61, { align: 'center' });

  // Recognition text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 95);
  doc.text('Se otorga con orgullo el presente reconocimiento a:', width / 2, 75, { align: 'center' });

  // Participant Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(11, 19, 43);
  doc.text(participant.nickname.toUpperCase(), width / 2, 90, { align: 'center' });

  // Underline beneath participant name
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.2);
  const nameWidth = doc.getTextWidth(participant.nickname.toUpperCase());
  doc.line(width / 2 - Math.max(nameWidth / 2, 35), 94, width / 2 + Math.max(nameWidth / 2, 35), 94);

  // Description body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 85);
  doc.text(
    'Por su sobresaliente desempeno y dominio de conocimientos en la evaluacion:',
    width / 2,
    106,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 19, 43);
  doc.text(`"${quizTitle}"`, width / 2, 114, { align: 'center' });

  // Metrics Box
  doc.setFillColor(248, 249, 253);
  doc.roundedRect(width / 2 - 80, 122, 160, 21, 3, 3, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(width / 2 - 80, 122, 160, 21, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  doc.text('PUNTAJE OFICIAL', width / 2 - 50, 129, { align: 'center' });
  doc.text('PRECISION', width / 2, 129, { align: 'center' });
  doc.text('ACIERTOS LOGRADOS', width / 2 + 50, 129, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(11, 19, 43);
  doc.text(`${(participant.totalScore || 0).toLocaleString()} pts`, width / 2 - 50, 138, { align: 'center' });
  doc.text(`${participant.accuracyPercentage || 0}%`, width / 2, 138, { align: 'center' });
  doc.text(`${participant.correctAnswersCount || 0} de ${participant.totalQuestionsCount || 8}`, width / 2 + 50, 138, { align: 'center' });

  // Date
  const dateStr = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  doc.text(`Expedido formalmente el ${dateStr}`, width / 2, 155, { align: 'center' });

  // Signature lines
  doc.setDrawColor(180, 180, 195);
  doc.setLineWidth(0.6);
  // Signature left
  doc.line(width / 2 - 95, 178, width / 2 - 20, 178);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 65);
  doc.text('Coordinacion de Capacitacion', width / 2 - 57.5, 183, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 135);
  doc.text('Club Cinepolis Master', width / 2 - 57.5, 187, { align: 'center' });

  // Signature right
  doc.line(width / 2 + 20, 178, width / 2 + 95, 178);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 65);
  doc.text('Administracion General', width / 2 + 57.5, 183, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 135);
  doc.text('Operaciones Cinepolis', width / 2 + 57.5, 187, { align: 'center' });

  const fileName = `Diploma_${rank}Lugar_${participant.nickname.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};

export const exportTop3Diplomas = (
  top3: Participant[],
  quizTitle: string
) => {
  top3.slice(0, 3).forEach((p, idx) => {
    exportDiplomaPDF(p, idx + 1, quizTitle);
  });
};

export const exportQuestionAnalyticsPDF = (
  analytics: QuestionAnalytics[],
  quizTitle: string = 'Cinepolis Master'
) => {
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
  doc.setFillColor(11, 27, 61); // Cinepolis navy
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Accent Line
  doc.setFillColor(243, 178, 30); // Cinepolis gold
  doc.rect(0, 40, pageWidth, 2.5, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE DE DIFICULTAD Y FALLOS POR PREGUNTA', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 225, 235);
  doc.text(`Evaluacion: ${quizTitle} | Cinepolis`, 14, 26);
  doc.setFontSize(8.5);
  doc.setTextColor(180, 190, 210);
  doc.text(`Generado: ${today}`, 14, 33);

  // Table
  const tableData = analytics.map((q, idx) => {
    const errorPct = 100 - q.accuracyPercentage;
    const diffLabel = q.accuracyPercentage < 50 ? 'Alta (Critica)' : q.accuracyPercentage < 75 ? 'Media' : 'Baja (Dominado)';
    return [
      `#${idx + 1}`,
      q.questionText,
      `${q.correctAnswers} (${q.accuracyPercentage}%)`,
      `${q.incorrectAnswers} (${errorPct}%)`,
      `${q.avgTimeSeconds ? q.avgTimeSeconds + 's' : '-'}`,
      diffLabel,
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Pregunta', 'Contestaron Bien', 'Contestaron Mal', 'Tiempo Prom.', 'Dificultad']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 27, 61],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 70, fontStyle: 'normal' },
      2: { cellWidth: 32, halign: 'center', textColor: [20, 140, 60], fontStyle: 'bold' },
      3: { cellWidth: 32, halign: 'center', textColor: [190, 30, 30], fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
    },
  });

  // Summary box at bottom
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  if (finalY < 250) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, finalY + 8, pageWidth - 28, 26, 3, 3, 'F');
    doc.setDrawColor(220, 225, 235);
    doc.roundedRect(14, finalY + 8, pageWidth - 28, 26, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 40, 60);
    doc.text('Recomendacion Didactica para el Equipo:', 18, finalY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 110);
    doc.text(
      'Enfocar la proxima capacitacion y retroalimentacion en las preguntas marcadas con Dificultad Alta,',
      18,
      finalY + 22
    );
    doc.text(
      'reforzando los conceptos de Club Cinepolis, beneficios de registro y requisitos de nivel.',
      18,
      finalY + 28
    );
  }

  doc.save(`Reporte_Preguntas_Dificiles_${quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
