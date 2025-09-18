// src/utils/exportPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Exporta una tabla a PDF con encabezado y pie sencillos.
 * rows: matriz de celdas (ya formateadas a string/number)
 * headers: encabezados de columnas
 */
export function exportTableToPDF(opts: {
  title: string;
  filename?: string;
  headers: (string | number)[];
  rows: (string | number)[][];
  footerNote?: string;
}) {
  const { title, filename, headers, rows, footerNote } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 40, 40);

  // Tabla
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [34, 86, 156], // azul suave
      textColor: 255,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: (data) => {
      // Pie de página con paginación
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(120);
      const text = `Página ${pageNumber}`;
      doc.text(text, pageSize.getWidth() - 40, pageHeight - 20, { align: "right" });

      if (footerNote) {
        doc.text(footerNote, 40, pageHeight - 20);
      }
    },
    margin: { left: 40, right: 40 },
  });

  const outName = filename || `${slugify(title)}.pdf`;
  doc.save(outName);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
