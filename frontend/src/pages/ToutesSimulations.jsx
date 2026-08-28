import { useEffect, useState } from "react";
import client from "../api/client";
import CarteOffre from "../components/CarteOffre";
import TableauAmortissement from "../components/TableauAmortissement";
import GraphiqueRepartition from "../components/GraphiqueRepartition";
import BadgeEndettement from "../components/BadgeEndettement";
import { SkeletonTableau } from "../components/Skeleton";

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function ToutesSimulations() {
  const [simulations, setSimulations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [revenu, setRevenu] = useState("");

  useEffect(() => {
    client
      .get("/simulations/all")
      .then((res) => setSimulations(res.data))
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
    } catch {
      setDetail(null);
    } finally {
      setChargementDetail(false);
    }
  }

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-2">Toutes les simulations</p>
        <h1 className="section-titre">Vue d'ensemble des simulations</h1>
        <p className="text-ardoise mt-2">
          Cette page affiche toutes les simulations effectuées dans le système.
          Réservée aux conseillers et administrateurs.
        </p>
      </div>

      {chargement && <SkeletonTableau lignes={6} />}

      {!chargement && simulations.length === 0 && (
        <div className="carte p-10 text-center">
          <p className="text-ardoise text-sm">Aucune simulation trouvée.</p>
        </div>
      )}

      {!chargement && simulations.length > 0 && (
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="carte overflow-hidden">
              <ul className="divide-y divide-ardoise/10">
                {simulations.map((sim) => (
                  <li key={sim.id}>
                    <button
                      type="button"
                      onClick={() => ouvrirDetail(sim.id)}
                      className={`w-full text-left px-5 py-4 hover:bg-papier transition-colors ${
                        detail?.id === sim.id ? "bg-or/5 border-l-4 border-l-or" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-indigo">{sim.nom_banque || "Offre"}</p>
                          <p className="text-xs text-ardoise mt-0.5">
                            {formateurDate.format(new Date(sim.date_creation))}
                          </p>
                        </div>
                        <span className="chiffres text-sm font-semibold text-or">
                          {sim.taeg.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-ardoise mt-2 chiffres">
                        {formateurFCFA.format(sim.montant)} F · {sim.duree_mois} mois ·{" "}
                        {formateurFCFA.format(sim.mensualite)} F/mois
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            {!detail && !chargementDetail && (
              <div className="carte p-10 text-center h-full flex items-center justify-center">
                <p className="text-ardoise text-sm">
                  Sélectionnez une simulation pour afficher le détail.
                </p>
              </div>
            )}

            {chargementDetail && <SkeletonTableau lignes={8} />}

            {detail && !chargementDetail && (
              <div className="space-y-6">
                <CarteOffre
                  offre={{
                    nom_banque: detail.nom_banque || "Simulation",
                    taeg: detail.taeg,
                    mensualite: detail.mensualite,
                    cout_total: detail.cout_total,
                  }}
                  dureeMois={detail.duree_mois}
                  afficherInterpretation={false}
                />

                <div className="carte p-4">
                  <label className="block text-sm text-ardoise mb-1">
                    Revenu mensuel (pour le taux d'endettement)
                  </label>
                  <input
                    type="number"
                    className="champ chiffres max-w-xs"
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
                      nomExport={`toutes-simulations-${detail.nom_banque || "credit"}`.replace(/\s+/g, "-")}
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