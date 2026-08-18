const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Barres horizontales comparatives (TAEG, mensualité ou coût total).
 */
export default function GraphiqueComparaison({ resultats, metrique = "taeg" }) {
  if (!resultats?.length) return null;

  const estTaeg = metrique === "taeg";
  const estMensualite = metrique === "mensualite";
  const label = estTaeg ? "TAEG (%)" : estMensualite ? "Mensualité (FCFA)" : "Coût total (FCFA)";
  const valeurs = resultats.map((r) => (estTaeg ? r.taeg : estMensualite ? r.mensualite : r.cout_total));
  const maxVal = Math.max(...valeurs) * 1.08;
  const meilleure = estTaeg ? Math.min(...valeurs) : Math.min(...valeurs);

  return (
    <div className="carte p-5 mb-6">
      <p className="eyebrow mb-4">Comparaison visuelle — {label}</p>
      <div className="space-y-4">
        {resultats.map((offre) => {
          const val = estTaeg ? offre.taeg : estMensualite ? offre.mensualite : offre.cout_total;
          const pct = (val / maxVal) * 100;
          const estMeilleure = val === meilleure;
          return (
            <div key={offre.offre_id}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={`font-medium ${estMeilleure ? "text-or" : "text-indigo"}`}>
                  {offre.nom_banque}
                  {estMeilleure && (
                    <span className="ml-2 text-xs text-or font-normal">★ meilleure</span>
                  )}
                </span>
                <span className="chiffres text-ardoise">
                  {estTaeg ? `${val.toFixed(2)}%` : `${formateurFCFA.format(val)} FCFA`}
                </span>
              </div>
              <div className="h-3 bg-ardoise/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    estMeilleure ? "bg-or" : "bg-indigo/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
