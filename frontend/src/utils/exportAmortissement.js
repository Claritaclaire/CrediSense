const formateur = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function exporterCSV(lignes, nomFichier = "amortissement", afficherInterets = false) {
  if (!lignes?.length) return;

  const entetes = ["Mois", "Mensualité", ...(afficherInterets ? ["Intérêts"] : []), "Capital", "Restant dû"];
  const rows = lignes.map((l) => [
    l.mois,
    formateur.format(l.mensualite),
    ...(afficherInterets ? [formateur.format(l.interets)] : []),
    formateur.format(l.part_capital),
    formateur.format(l.capital_restant_fin),
  ]);

  const contenu = [entetes, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${nomFichier}.csv`;
  lien.click();
  URL.revokeObjectURL(url);
}

export function exporterPDF(lignes, titre = "Tableau d'amortissement", afficherInterets = false) {
  if (!lignes?.length) return;

  const echapperHTML = (valeur) =>
    String(valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fcfa = (valeur) => `${formateur.format(valeur)} FCFA`;
  const lignesHTML = lignes
    .map(
      (ligne) => `
    <tr>
      <td>${ligne.mois}</td>
      <td>${fcfa(ligne.mensualite)}</td>
      ${afficherInterets ? `<td>${fcfa(ligne.interets)}</td>` : ""}
      <td>${fcfa(ligne.part_capital)}</td>
      <td>${fcfa(ligne.capital_restant_fin)}</td>
    </tr>`
    )
    .join("");

  const htmlContent = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${echapperHTML(
    titre
  )}</title><style>
    @media print {
      body { margin: 0; }
      @page { margin: 12mm; size: A4; }
    }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1e1b4b; padding: 24px; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; }
    h1 { color: #312e81; font-size: 22px; margin: 0 0 6px 0; font-weight: 800; }
    p { color: #64748b; font-size: 12px; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
    th { background: #312e81; color: #ffffff; text-align: left; font-weight: 700; }
    th, td { padding: 8px 10px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background-color: #f8fafc; }
    td:not(:first-child), th:not(:first-child) { text-align: right; }
  </style></head><body>
    <div class="header">
      <h1>${echapperHTML(titre)}</h1>
      <p>Document d'amortissement · Édité le ${new Date().toLocaleDateString("fr-FR")}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Mois</th>
          <th>Mensualité</th>
          ${afficherInterets ? "<th>Intérêts</th>" : ""}
          <th>Capital</th>
          <th>Restant dû</th>
        </tr>
      </thead>
      <tbody>${lignesHTML}</tbody>
    </table>
  </body></html>`;

  // Création d'une iframe invisible pour contourner le bloqueur de pop-ups du navigateur
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 300);
}
