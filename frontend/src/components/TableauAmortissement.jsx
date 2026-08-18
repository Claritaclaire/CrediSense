import { useState } from "react";
import { exporterCSV, exporterPDF } from "../utils/exportAmortissement";

const formateurFCFA = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const LIGNES_PAR_PAGE = 12;

export default function TableauAmortissement({ lignes, nomExport = "amortissement" }) {
  const [page, setPage] = useState(0);

  if (!lignes || lignes.length === 0) return null;

  const totalPages = Math.ceil(lignes.length / LIGNES_PAR_PAGE);
  const debut = page * LIGNES_PAR_PAGE;
  const lignesPage = lignes.slice(debut, debut + LIGNES_PAR_PAGE);

  return (
    <div className="carte p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="eyebrow">Tableau d'amortissement</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exporterPDF(lignes, "Tableau d'amortissement")} className="btn-ghost text-indigo border border-ardoise/20">
            ↓ Exporter PDF
          </button>
          <button type="button" onClick={() => exporterCSV(lignes, nomExport)} className="btn-ghost text-indigo border border-ardoise/20">
            ↓ Exporter CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm chiffres min-w-[480px]">
          <thead>
            <tr className="text-left text-ardoise border-b border-ardoise/20">
              <th className="py-2.5 pr-4 font-medium">Mois</th>
              <th className="py-2.5 pr-4 font-medium text-right">Mensualité</th>
              <th className="py-2.5 pr-4 font-medium text-right">Intérêts</th>
              <th className="py-2.5 pr-4 font-medium text-right">Capital</th>
              <th className="py-2.5 font-medium text-right">Restant dû</th>
            </tr>
          </thead>
          <tbody>
            {lignesPage.map((ligne) => (
              <tr key={ligne.mois} className="border-b border-ardoise/8 hover:bg-papier/80">
                <td className="py-2.5 pr-4">{ligne.mois}</td>
                <td className="py-2.5 pr-4 text-right">{formateurFCFA.format(ligne.mensualite)} F</td>
                <td className="py-2.5 pr-4 text-right text-ardoise">
                  {formateurFCFA.format(ligne.interets)} F
                </td>
                <td className="py-2.5 pr-4 text-right">{formateurFCFA.format(ligne.part_capital)} F</td>
                <td className="py-2.5 text-right font-medium">
                  {formateurFCFA.format(ligne.capital_restant_fin)} F
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 filet text-sm">
          <span className="text-ardoise chiffres">
            Mois {debut + 1}–{Math.min(debut + LIGNES_PAR_PAGE, lignes.length)} sur {lignes.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="btn-ghost disabled:opacity-40"
            >
              ← Préc.
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
