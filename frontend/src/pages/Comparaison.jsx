import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import FormulaireSimulation from "../components/FormulaireSimulation";
import CarteOffre from "../components/CarteOffre";
import GraphiqueComparaison from "../components/GraphiqueComparaison";

export default function Comparaison() {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [dureeUtilisee, setDureeUtilisee] = useState(null);
  const [montantUtilise, setMontantUtilise] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [metriqueGraphique, setMetriqueGraphique] = useState("taeg");
  const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  useEffect(() => {
    client.get("/offres/").then((res) => setOffres(res.data));
  }, []);

  async function handleSubmit(payload) {
    setErreur("");
    setChargement(true);
    setResultats([]);
    try {
      const { data } = await client.post("/simulations/comparer", payload);
      setResultats(data);
      setDureeUtilisee(payload.duree_mois);
      setMontantUtilise(payload.montant);
    } catch (err) {
      setErreur(err.response?.data?.detail || "Impossible de comparer ces offres.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-white/20 bg-indigo/80 px-6 py-7 shadow-lg backdrop-blur-sm">
        <p className="eyebrow mb-2">Comparateur</p>
        <h1 className="section-titre">Comparer plusieurs offres</h1>
        <p className="mt-2 max-w-xl text-white/80">
          Sélectionnez plusieurs produits, saisissez un montant et une durée communs — les résultats sont triés par TAEG.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="rounded-xl border border-or/30 bg-or/10 p-5">
            <p className="eyebrow mb-2">Étape 1</p>
            <h2 className="text-xl font-bold text-indigo">Configurez votre comparaison</h2>
            <p className="mt-1 text-sm text-ardoise">Choisissez au moins deux offres, puis donnez-leur les mêmes paramètres.</p>
          </div>
          <FormulaireSimulation
            offres={offres}
            onSubmit={handleSubmit}
            chargement={chargement}
            multiSelect
          />
          {erreur && <p className="alerte-erreur mt-4">{erreur}</p>}
        </div>

        <div>
          {resultats.length === 0 && !chargement && (
            <p className="text-sm text-white/80">
              Sélectionnez au moins deux offres et lancez la comparaison pour visualiser les écarts.
            </p>
          )}

          {resultats.length > 0 && (
            <>
              {(() => {
                const meilleure = resultats[0];
                const moinsBonne = resultats[resultats.length - 1];
                const economie = Math.max(0, moinsBonne.cout_total - meilleure.cout_total);
                return (
                  <>
                    <div className="mb-5 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-white/85 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-ardoise">Montant</p><p className="mt-1 text-sm font-bold text-indigo chiffres">{formateurFCFA.format(montantUtilise)} F</p></div>
                      <div className="rounded-xl bg-white/85 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-ardoise">Durée</p><p className="mt-1 text-sm font-bold text-indigo chiffres">{dureeUtilisee} mois</p></div>
                      <div className="rounded-xl bg-white/85 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-ardoise">Offres étudiées</p><p className="mt-1 text-sm font-bold text-indigo chiffres">{resultats.length}</p></div>
                      <div className="rounded-xl bg-or/15 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase text-ardoise">Meilleur TAEG</p><p className="mt-1 text-sm font-bold text-indigo chiffres">{meilleure.taeg.toFixed(2)} %</p></div>
                    </div>

                    <section className="mb-6 rounded-2xl bg-gradient-to-br from-indigo to-indigo-dark p-6 text-white shadow-xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-or">Offre recommandée</p>
                      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div><h2 className="text-2xl font-bold">{meilleure.nom_banque}</h2><p className="mt-2 text-sm text-white/70">TAEG le plus avantageux parmi les offres sélectionnées.</p></div>
                        <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] uppercase text-white/60">Mensualité</p><p className="mt-1 font-bold chiffres">{formateurFCFA.format(meilleure.mensualite)} F</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] uppercase text-white/60">Écart total</p><p className="mt-1 font-bold text-or chiffres">{formateurFCFA.format(economie)} F</p></div></div>
                      </div>
                      <button type="button" onClick={() => navigate(`/simulation?offre_id=${meilleure.offre_id}&montant=${montantUtilise}&duree=${dureeUtilisee}`)} className="mt-5 rounded-lg bg-or px-4 py-2.5 text-sm font-bold text-indigo hover:bg-amber-400">Simuler cette offre →</button>
                    </section>
                  </>
                );
              })()}

              <div className="flex gap-2 mb-4">
                {["taeg", "mensualite", "cout_total"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetriqueGraphique(m)}
                    className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                      metriqueGraphique === m
                        ? "bg-indigo text-papier"
                        : "bg-ardoise/10 text-ardoise hover:bg-ardoise/20"
                    }`}
                  >
                    {m === "taeg" ? "TAEG" : m === "mensualite" ? "Mensualité" : "Coût total"}
                  </button>
                ))}
              </div>

              <GraphiqueComparaison resultats={resultats} metrique={metriqueGraphique} />

              <p className="text-sm text-ardoise mb-4">Classement par TAEG : le taux effectif global reflète le coût réel du crédit.</p>

              <div className="grid sm:grid-cols-2 gap-5">
                {resultats.map((offre, index) => {
                  const offreComplete = offres.find((o) => String(o.id) === String(offre.offre_id));
                  return (
                    <div key={offre.offre_id} className="relative">
                      <span className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-sm font-bold text-white shadow">{index + 1}</span>
                      <CarteOffre offre={offre} recommandee={index === 0} tauxAnnuel={offreComplete?.taux_annuel} dureeMois={dureeUtilisee} afficherInterpretation />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
