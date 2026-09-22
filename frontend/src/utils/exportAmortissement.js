const formateur = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function exporterCSV(lignes, nomFichier = "amortissement", afficherInterets = false, resume = {}) {
  if (!lignes?.length) return;

  const { montantSouhaite, mensualite, nomBanque } = resume;
  const lignesResume = [];
  if (nomBanque) lignesResume.push(["Offre", nomBanque]);
  if (montantSouhaite != null) lignesResume.push(["Montant emprunté (FCFA)", formateur.format(montantSouhaite)]);
  if (mensualite != null) lignesResume.push(["Mensualité (FCFA)", formateur.format(mensualite)]);

  const entetes = ["Mois", "Mensualité", ...(afficherInterets ? ["Intérêts"] : []), "Capital", "Restant dû"];
  const rows = lignes.map((l) => [
    l.mois,
    formateur.format(l.mensualite),
    ...(afficherInterets ? [formateur.format(l.interets)] : []),
    formateur.format(l.part_capital),
    formateur.format(l.capital_restant_fin),
  ]);

  const contenu = [...lignesResume, [], entetes, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(";"))
    .join("\n");

  const blob = new Blob(["﻿" + contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${nomFichier}.csv`;
  lien.click();
  URL.revokeObjectURL(url);
}

export function exporterPDF(lignes, titre = "Tableau d'amortissement", afficherInterets = false, resume = {}) {
  if (!lignes?.length) return;

  const echapperHTML = (valeur) =>
    String(valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fcfa = (valeur) => `${formateur.format(valeur)} FCFA`;
  const { montantSouhaite, mensualite, nomBanque } = resume;

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

  const cartesResume = [
    nomBanque ? { label: "Offre", valeur: echapperHTML(nomBanque) } : null,
    montantSouhaite != null ? { label: "Montant emprunté", valeur: fcfa(montantSouhaite) } : null,
    mensualite != null ? { label: "Mensualité", valeur: fcfa(mensualite) } : null,
  ].filter(Boolean);

  const resumeHTML = cartesResume.length
    ? `<div class="resume">${cartesResume
        .map((c) => `<div class="resume-carte"><p class="resume-label">${c.label}</p><p class="resume-valeur">${c.valeur}</p></div>`)
        .join("")}</div>`
    : "";

  const htmlContent = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${echapperHTML(
    titre
  )}</title><style>
    @media print {
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 12mm; size: A4; }
    }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1e1b4b; padding: 24px; position: relative; }
    .filigrane {
      position: fixed;
      top: 50%; left: 50%;
      width: 70%;
      transform: translate(-50%, -50%);
      opacity: 0.07;
      z-index: -1;
      pointer-events: none;
    }
    .header { margin-bottom: 16px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; }
    h1 { color: #312e81; font-size: 22px; margin: 0 0 6px 0; font-weight: 800; }
    p { color: #64748b; font-size: 12px; margin: 0; }
    .resume { display: flex; gap: 12px; margin: 16px 0; }
    .resume-carte { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .resume-label { font-size: 10px; text-transform: uppercase; color: #64748b; margin: 0 0 2px 0; }
    .resume-valeur { font-size: 15px; font-weight: 800; color: #312e81; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { background: #312e81; color: #ffffff; text-align: left; font-weight: 700; }
    th, td { padding: 8px 10px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background-color: #f8fafc; }
    td:not(:first-child), th:not(:first-child) { text-align: right; }
  </style></head><body>
    <img class="filigrane" src="/logo-cca-bank.png" alt="" />
    <div class="header">
      <h1>${echapperHTML(titre)}</h1>
      <p>Document d'amortissement · Édité le ${new Date().toLocaleDateString("fr-FR")}</p>
    </div>
    ${resumeHTML}
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
