import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [simulations, setSimulations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [revenu, setRevenu] = useState("");
  const [chargesMensuelles, setChargesMensuelles] = useState(0);
  const [mensualitesPrets, setMensualitesPrets] = useState(0);

  useEffect(() => {
    client
      .get("/simulations/historique")
      .then((res) => setSimulations(res.data))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let annule = false;
    async function chargerEngagements() {
      let charges = 0;
      let prets = 0;
      try {
        const profil = JSON.parse(localStorage.getItem(`credisense_profil_${user.id}`) || "{}");
        charges = Number(profil.charges) || 0;
        setRevenu(profil.revenu ? String(profil.revenu) : "");
      } catch {
        // Le profil local peut être absent ou incomplet.
      }
      try {
        const { data } = await client.get("/historique-prets/");
        prets += (data || [])
          .filter((pret) => pret.statut === "en_cours")
          .reduce((total, pret) => total + (pret.mensualite || 0), 0);
      } catch {
        // Les prêts locaux restent utilisables si l'API est indisponible.
      }
      try {
        const locaux = JSON.parse(localStorage.getItem(`credisense_prets_${user.id}`) || "[]");
        prets += (locaux || [])
          .filter((pret) => pret.statut === "en_cours")
          .reduce((total, pret) => total + (pret.mensualite || 0), 0);
      } catch {
        // Aucun prêt local disponible.
      }
      if (!annule) {
        setChargesMensuelles(charges);
        setMensualitesPrets(prets);
      }
    }
    chargerEngagements();
    return () => { annule = true; };
  }, [user]);

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
        <div className="grid gap-8 lg:grid-cols-5">
          <div className={`${detail ? "hidden lg:block" : "block"} lg:col-span-2`}>
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

          <div className={`${detail ? "block" : "hidden lg:block"} lg:col-span-3`}>
            {!detail && !chargementDetail && (
              <p className="text-sm text-white/80">Sélectionnez une simulation pour afficher son détail.</p>
            )}

            {chargementDetail && <SkeletonTableau lignes={8} />}

            {detail && !chargementDetail && (
              <div className="space-y-6">
                <button type="button" onClick={() => setDetail(null)} className="btn-ghost lg:hidden">
                  ← Retour à mes simulations
                </button>
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
                  <label className="mb-1 block text-sm text-ardoise">Engagements financiers utilisés</label>
                  <p className="text-xs text-ardoise">Revenu : <strong className="text-indigo">{revenu ? formateurFCFA.format(Number(revenu)) : "non renseigné"} FCFA</strong> · Charges : <strong className="text-indigo">{formateurFCFA.format(chargesMensuelles)} FCFA</strong> · Prêts en cours : <strong className="text-indigo">{formateurFCFA.format(mensualitesPrets)} FCFA</strong></p>
                  <p className="mt-2 text-xs text-slate-500">Ces valeurs proviennent de votre profil et de vos prêts enregistrés.</p>
                </div>

                <BadgeEndettement mensualite={detail.mensualite} revenu={revenu} chargesMensuelles={chargesMensuelles} mensualitesPrets={mensualitesPrets} />

                <button type="button" onClick={() => navigate(`/simulation?offre_id=${detail.offre_id}&montant=${detail.montant}&duree=${detail.duree_mois}`)} className="btn-primaire w-full sm:w-auto">
                  Refaire cette simulation →
                </button>

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
