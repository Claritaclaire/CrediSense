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

export default function Historique() {
  const [simulations, setSimulations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [revenu, setRevenu] = useState("");

  useEffect(() => {
    client
      .get("/simulations/historique")
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

  async function supprimerSimulation(e, id) {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette simulation de votre historique ?")) {
      return;
    }
    try {
      await client.delete(`/simulations/${id}`);
      setSimulations((prev) => prev.filter((sim) => sim.id !== id));
      if (detail?.id === id) {
        setDetail(null);
      }
    } catch {
      alert("Impossible de supprimer cette simulation pour le moment.");
    }
  }

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-2">Vos simulations</p>
        <h1 className="section-titre">Historique</h1>
        <p className="text-ardoise mt-2">
          Retrouvez vos simulations passées et rouvrez le détail complet.
        </p>
      </div>

      {chargement && <SkeletonTableau lignes={6} />}

      {!chargement && simulations.length === 0 && (
        <p className="text-sm text-white/80">Vous n'avez encore réalisé aucune simulation.</p>
      )}

      {!chargement && simulations.length > 0 && (
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="carte overflow-hidden">
              <ul className="divide-y divide-ardoise/10">
                {simulations.map((sim) => (
                  <li key={sim.id}>
                    <div
                      onClick={() => ouvrirDetail(sim.id)}
                      className={`w-full cursor-pointer px-5 py-4 hover:bg-papier transition-colors ${
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
                        <div className="flex items-center gap-2">
                          <span className="chiffres text-sm font-semibold text-or">
                            {sim.taeg.toFixed(2)}%
                          </span>
                          <button
                            type="button"
                            title="Supprimer cette simulation"
                            onClick={(e) => supprimerSimulation(e, sim.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-ardoise mt-2 chiffres">
                        {formateurFCFA.format(sim.montant)} F · {sim.duree_mois} mois ·{" "}
                        {formateurFCFA.format(sim.mensualite)} F/mois
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            {!detail && !chargementDetail && (
              <p className="text-sm text-white/80">Sélectionnez une simulation pour afficher son détail.</p>
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
                    <GraphiqueRepartition lignes={detail.tableau_amortissement} />
                    <TableauAmortissement
                      lignes={detail.tableau_amortissement}
                      nomExport={`historique-${detail.nom_banque || "credit"}`.replace(/\s+/g, "-")}
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
