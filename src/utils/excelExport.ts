import ExcelJS from 'exceljs';
import type { Participant } from '../types/quiz';
import type { QuestionAnalytics } from '../services/quizService';
import { getHardwareHash } from './security';
import { saveDocument } from './platform';

export interface ExcelExportOptions {
  quizTitle: string;
  rankings: Participant[];
  allRankings?: Participant[];
  questionAnalytics?: QuestionAnalytics[];
  attemptsCountMap?: Map<string, number>;
  deviceUsersMap?: Map<string, Set<string>>;
}

const normalizeName = (name: string) =>
  (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const exportRankingsToExcel = async ({
  quizTitle,
  rankings,
  questionAnalytics = [],
  attemptsCountMap,
  deviceUsersMap,
}: ExcelExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Club Cinépolis Master';
  workbook.created = new Date();

  // Hoja 1: Ranking de Participantes
  const sheet = workbook.addWorksheet('Ranking Participantes', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  // Título corporativo
  sheet.mergeCells('A1:M1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `REPORTE OFICIAL DE EVALUACIÓN — ${quizTitle.toUpperCase()} (CINÉPOLIS)`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B132B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:M2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Generado el ${new Date().toLocaleString('es-MX')} • Total de registros: ${rankings.length}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3B21E' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Encabezados
  const headers = [
    'Posición',
    'Colaborador',
    'Área / Departamento',
    'Puntaje',
    'Aciertos',
    'Total Preguntas',
    'Precisión (%)',
    'Estatus (>=80%)',
    'Racha Máx.',
    'Intentos Nombre',
    'Salidas Pestaña',
    'Alerta Dispositivo',
    'Fecha y Hora',
  ];

  const headerRow = sheet.getRow(3);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  rankings.forEach((p, idx) => {
    const norm = normalizeName(p.nickname);
    const attempts = attemptsCountMap?.get(norm) || 1;
    const hw = getHardwareHash(p.deviceId);
    const sharedCount = hw && deviceUsersMap?.get(hw)?.size ? deviceUsersMap.get(hw)!.size : 1;
    const approved = (p.accuracyPercentage || 0) >= 80;

    const row = sheet.addRow([
      idx + 1,
      p.nickname,
      p.department || 'Sin especificar',
      p.totalScore || 0,
      p.correctAnswersCount || 0,
      p.totalQuestionsCount || 8,
      p.accuracyPercentage || 0,
      approved ? 'APROBADO' : 'REFORZAR',
      p.maxStreak || 0,
      attempts > 1 ? `SÍ (${attempts} intentos)` : 'Limpio (1)',
      p.tabSwitches && p.tabSwitches > 0
        ? `${p.tabSwitches} salida(s) (${Math.round((p.timeAwayMs || 0) / 1000)}s)`
        : '0 (Sin salidas)',
      sharedCount > 1 ? `Dispositivo usado por ${sharedCount} nombres` : 'Dispositivo único',
      new Date(p.completedAt).toLocaleString('es-MX'),
    ]);

    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 2 || colNumber === 3 ? 'left' : 'center',
      };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      if (colNumber === 8) {
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: approved ? 'FF15803D' : 'FFB91C1C' },
        };
      }
      if ((colNumber === 10 && attempts > 1) || (colNumber === 11 && (p.tabSwitches || 0) > 0) || (colNumber === 12 && sharedCount > 1)) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
      }
    });
  });

  const widths = [10, 28, 24, 14, 12, 15, 14, 16, 12, 18, 20, 26, 22];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // Hoja 2: Resumen por Área de Trabajo
  const branchSheet = workbook.addWorksheet('Por Área de Trabajo');
  branchSheet.mergeCells('A1:E1');
  const bTitle = branchSheet.getCell('A1');
  bTitle.value = 'PROMEDIO POR ÁREA DE TRABAJO — CINÉPOLIS';
  bTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  bTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B132B' } };
  bTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  branchSheet.getRow(1).height = 26;

  const bHeader = branchSheet.getRow(2);
  bHeader.values = ['Área / Puesto', 'Participantes', 'Puntaje Promedio', 'Precisión Promedio (%)', 'Aprobados (>=80%)'];
  bHeader.height = 22;
  bHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const groupStats = (keyFn: (p: Participant) => string) => {
    const map = new Map<string, Participant[]>();
    rankings.forEach(p => {
      const k = keyFn(p) || 'Sin especificar';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([name, list]) => {
        const avgScore = Math.round(list.reduce((s, x) => s + (x.totalScore || 0), 0) / list.length);
        const avgAcc = Math.round(list.reduce((s, x) => s + (x.accuracyPercentage || 0), 0) / list.length);
        const approvedCount = list.filter(x => (x.accuracyPercentage || 0) >= 80).length;
        branchSheet.addRow([name, list.length, avgScore, avgAcc, `${approvedCount} / ${list.length}`]);
      });
  };

  groupStats(p => p.department || 'Sin especificar');
  [28, 16, 20, 22, 18].forEach((w, i) => (branchSheet.getColumn(i + 1).width = w));

  // Hoja 3: Analítica de Preguntas
  if (questionAnalytics.length > 0) {
    const qSheet = workbook.addWorksheet('Análisis por Pregunta');
    qSheet.mergeCells('A1:G1');
    const qTitle = qSheet.getCell('A1');
    qTitle.value = 'REPORTE DE DIFICULTAD Y ACIERTOS POR PREGUNTA';
    qTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    qTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B132B' } };
    qTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    qSheet.getRow(1).height = 26;

    const qHeader = qSheet.getRow(2);
    qHeader.values = ['#', 'Pregunta', 'Contestaron Bien', 'Contestaron Mal', '% Acierto', 'Tiempo Prom. (s)', 'Dificultad'];
    qHeader.height = 22;
    qHeader.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    questionAnalytics.forEach(q => {
      qSheet.addRow([
        `#${q.orderIndex + 1}`,
        q.questionText,
        q.correctAnswers,
        q.incorrectAnswers,
        `${q.accuracyPercentage}%`,
        q.avgTimeSeconds || 0,
        q.difficulty === 'hard' ? 'Alta' : q.difficulty === 'medium' ? 'Media' : 'Baja',
      ]);
    });
    [8, 55, 18, 18, 14, 18, 14].forEach((w, i) => (qSheet.getColumn(i + 1).width = w));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeTitle = quizTitle.replace(/[^a-zA-Z0-9]/g, '_');
  return saveDocument(blob, `Reporte_Cinepolis_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
