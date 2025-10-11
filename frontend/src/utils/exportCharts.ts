// src/utils/exportCharts.ts
import jsPDF from "jspdf";

type ChartImage = {
  title?: string;
  dataUrl: string; // base64 "image/png" recomendado
};

/**
 * Exporta un set de gráficas (imágenes) a un PDF.
 * - Coloca título y subtítulo en la primera página.
 * - Dibuja cada gráfica en su propia página con su encabezado.
 * - Acomoda la imagen manteniendo márgenes y relación aproximada.
 */
export function exportChartsToPDF(opts: {
  title: string;
  subtitle?: string;
  charts: ChartImage[];
  filename?: string;
}) {
  const { title, subtitle, charts, filename } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 40;

  // Portada / primera página
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, marginTop + 10);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, marginX, marginTop + 30);
  }

  // Si hay al menos una gráfica, la primera va al final de la primera página,
  // las siguientes en páginas nuevas.
  const drawChart = (img: ChartImage, isFirstPage: boolean) => {
    const startY = isFirstPage ? marginTop + 60 : marginTop;

    // Título de la gráfica
    if (img.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(String(img.title), marginX, startY);
    }

    // Área para imagen
    const topY = img.title ? startY + 10 : startY;

    // Dimensiones (ancho máximo, alto proporcional estándar)
    const maxW = pageW - marginX * 2;
    const imgW = maxW;
    const imgH = Math.round(maxW * 0.52); // relación aproximada para charts apaisados

    doc.addImage(img.dataUrl, "PNG", marginX, topY, imgW, imgH);

    // Pie de página
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Página ${doc.getCurrentPageInfo().pageNumber}`,
      pageW - marginX,
      pageH - 18,
      { align: "right" }
    );
    doc.setTextColor(0);
  };

  if (charts.length) {
    // Primera va en la portada
    drawChart(charts[0], true);
    // Resto en páginas nuevas
    for (let i = 1; i < charts.length; i++) {
      doc.addPage();
      drawChart(charts[i], false);
    }
  }

  const out = filename || slugify(title) + ".pdf";
  doc.save(out);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
