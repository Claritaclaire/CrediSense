import { useEffect, useState } from "react";
import client from "../../api/client";
import CarteOffre from "../../components/CarteOffre";
import TableauAmortissement from "../../components/TableauAmortissement";
import GraphiqueRepartition from "../../components/GraphiqueRepartition";
import BadgeEndettement from "../../components/BadgeEndettement";
import { SkeletonTableau } from "../../components/Skeleton";

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function AdminSimulations() {
  const [simulations, setSimulations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [revenu, setRevenu] = useState("");

  useEffect(() => {
    client
      .get("/simulations/all")
      .then((res) => setSimulations(res.data))
      .catch((err) => console.error("Erreur chargement simulations:", err))
      .finally(() => setChargement(false));
  }, []);

  async function ouvrirDetail(id) {
    if (detail?.id === id) {
      setDetail(null);
      return;
    }
    setChargementDetail(true);
    try {
      const { data } = await client.get(`/simulations/${id}`);
      setDetail(data);
    } catch (err) {
      console.error("Erreur détails simulation:", err);
      setDetail(null);
    } finally {
      setChargementDetail(false);
    }
  }

  return (
    <div className="p-2 sm:p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-indigo">Gestion des calculs</h1>
        <p className="text-ardoise text-sm mt-1">
          Consultez la liste des calculs et cliquez sur une ligne pour afficher les détails et l'amortissement.
        </p>
      </div>

      {chargement && <SkeletonTableau lignes={6} />}

      {!chargement && simulations.length === 0 && (
        <div className="bg-white p-8 text-center rounded-lg border border-ardoise/20">
          <p className="text-ardoise text-sm">Aucun calcul trouvé.</p>
        </div>
      )}

      {!chargement && simulations.length > 0 && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-ardoise/20 overflow-hidden shadow-sm">
              <ul className="divide-y divide-ardoise/10">
                {simulations.map((sim) => (
                  <li key={sim.id}>
                    <button
                      type="button"
                      onClick={() => ouvrirDetail(sim.id)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-gris-tres-clair transition-colors ${
                        detail?.id === sim.id ? "bg-or/10 border-l-4 border-l-or" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-indigo text-sm">{sim.nom_banque || "Calcul"}</p>
                          <p className="text-xs text-ardoise mt-0.5">
                            {sim.date_creation ? formateurDate.format(new Date(sim.date_creation)) : "N/A"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-or">
                          {sim.taeg ? sim.taeg.toFixed(2) : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-ardoise mt-2">
                        {formateurFCFA.format(sim.montant || 0)} F · {sim.duree_mois} mois ·{" "}
                        {formateurFCFA.format(sim.mensualite || 0)} F/mois
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            {!detail && !chargementDetail && (
              <div className="bg-white rounded-lg border border-ardoise/20 p-8 text-center min-h-[250px] flex items-center justify-center">
                <p className="text-ardoise text-sm">
                  Sélectionnez une simulation dans la liste pour afficher son détail.
                </p>
              </div>
            )}

            {chargementDetail && <SkeletonTableau lignes={8} />}

            {detail && !chargementDetail && (
              <div className="space-y-6">
                <CarteOffre
                  offre={{
                    nom_banque: detail.nom_banque || "Calcul",
                    taeg: detail.taeg,
                    mensualite: detail.mensualite,
                    cout_total: detail.cout_total,
                  }}
                  dureeMois={detail.duree_mois}
                  afficherInterpretation={false}
                />

                <div className="bg-white rounded-lg border border-ardoise/20 p-4">
                  <label className="block text-sm text-ardoise mb-1 font-medium">
                    Revenu mensuel (pour le taux d'endettement)
                  </label>
                  <input
                    type="number"
                    className="w-full max-w-xs border border-ardoise/30 rounded px-3 py-1.5 text-sm"
                    placeholder="Ex. 350 000"
                    value={revenu}
                    onChange={(e) => setRevenu(e.target.value)}
                  />
                </div>

                <BadgeEndettement mensualite={detail.mensualite} revenu={revenu} />

                {detail.tableau_amortissement && (
                  <>
                    <GraphiqueRepartition lignes={detail.tableau_amortissement} afficherInterets />
                    <TableauAmortissement
                      lignes={detail.tableau_amortissement}
                      nomExport={`credit-admin-${detail.nom_banque || "credit"}`.replace(/\s+/g, "-")}
                      afficherInterets
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
