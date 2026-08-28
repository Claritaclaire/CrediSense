import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import FormulaireSimulation from "../components/FormulaireSimulation";
import TableauAmortissement from "../components/TableauAmortissement";
import RecommandationIA from "../components/RecommandationIA";
import BadgeEndettement from "../components/BadgeEndettement";
import ProfilFinancier from "../components/ProfilFinancier";
import GraphiqueRepartition from "../components/GraphiqueRepartition";
import InterpretationTAEG from "../components/InterpretationTAEG";
import { SkeletonCarte } from "../components/Skeleton";
import CapaciteEmprunt from "../components/CapaciteEmprunt";

export default function Simulation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const urlOffreId = searchParams.get("offre_id") || "";
  const urlMontant = searchParams.get("montant") || "";
  const urlDuree = searchParams.get("duree") || "";

  // ----- Offers -----
  const [offres, setOffres] = useState([]);
  const [chargementOffres, setChargementOffres] = useState(true);
  const [erreurOffres, setErreurOffres] = useState("");

  // ----- Simulation -----
  const [resultat, setResultat] = useState(null);
  const [offreSelectionnee, setOffreSelectionnee] = useState(null);
  const [chargementSimulation, setChargementSimulation] = useState(false);
  const [erreurSimulation, setErreurSimulation] = useState("");

  // ----- IA Recommendation -----
  const [recommandation, setRecommandation] = useState("");
  const [chargementIA, setChargementIA] = useState(false);
  const [erreurIA, setErreurIA] = useState("");

  // ----- Form fields persisted -----
  const [dernierePayload, setDernierePayload] = useState(null);
  const [revenu, setRevenu] = useState("");
  const [apport, setApport] = useState("");
  const [projet, setProjet] = useState("");

  // Load persisted values on mount
  useEffect(() => {
    try {
      const savedPayload = localStorage.getItem("simulationPayload");
      const savedRevenu = localStorage.getItem("simulationRevenu");
      const savedApport = localStorage.getItem("simulationApport");
      const savedProjet = localStorage.getItem("simulationProjet");
      if (savedPayload) setDernierePayload(JSON.parse(savedPayload));
      if (savedRevenu) setRevenu(savedRevenu);
      if (savedApport) setApport(savedApport);
      if (savedProjet) setProjet(savedProjet);
    } catch (e) {
      console.warn("Failed to read simulation persisted state", e);
    }
  }, []);

  // Persist changes to form fields
  useEffect(() => {
    if (dernierePayload) {
      try {
        localStorage.setItem("simulationPayload", JSON.stringify(dernierePayload));
      } catch (e) {
        console.warn("Failed to persist simulation payload", e);
      }
    }
    if (revenu) localStorage.setItem("simulationRevenu", revenu);
    if (apport) localStorage.setItem("simulationApport", apport);
    if (projet) localStorage.setItem("simulationProjet", projet);
  }, [dernierePayload, revenu, apport, projet]);

  // Load persisted simulation result when offers change
  useEffect(() => {
    const stored = localStorage.getItem("simulationResult");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Find the offer again (may have been removed/reordered)
        const offre = offres.find(o => String(o.id) === String(parsed.offreSelectionneeId));
        if (offre) {
          setResultat(parsed.resultat);
          setOffreSelectionnee(offre);
          setRecommandation(parsed.recommandation ?? "");
        } else {
          // Offer no longer exists – clear persisted result to avoid stale data
          localStorage.removeItem("simulationResult");
        }
      } catch (e) {
        console.warn("Failed to parse simulationResult", e);
      }
    }
  }, [offres]);

  // Fetch offers
  useEffect(() => {
    let cancelled = false;
    const loadOffres = async () => {
      setChargementOffres(true);
      setErreurOffres("");
      try {
        const { data } = await client.get("/offres/");
        if (!cancelled) setOffres(data);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setErreurOffres("Impossible de charger les offres de crédit.");
        }
      } finally {
        if (!cancelled) setChargementOffres(false);
      }
    };
    loadOffres();
    return () => {
      cancelled = true;
    };
  }, []);

  // Submit simulation
  const handleSubmit = useCallback(
    async (payload) => {
      setErreurSimulation("");
      setChargementSimulation(true);
      setResultat(null);
      setRecommandation("");
      try {
        const { data } = await client.post("/simulations/", payload);
        setResultat(data);
        const offreSel = offres.find(o => String(o.id) === String(payload.offre_id));
        setOffreSelectionnee(offreSel);
        setDernierePayload(payload);
        // Persist simulation result
        localStorage.setItem(
          "simulationResult",
          JSON.stringify({
            resultat: data,
            offreSelectionneeId: offreSel ? offreSel.id : null,
            recommandation: recommandation // may be empty
          })
        );
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          err.message ||
          "Impossible de calculer cette simulation.";
        setErreurSimulation(msg);
      } finally {
        setChargementSimulation(false);
      }
    },
    [offres, recommandation]
  );

  // Request IA recommendation
  const demanderRecommandation = useCallback(async () => {
    if (!revenu || !apport || !dernierePayload) return;
    setErreurIA("");
    setChargementIA(true);
    setRecommandation("");

    // 1. Profil financier du localStorage
    let profilLocal = {};
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`credisense_profil_${user.id}`);
        if (stored) profilLocal = JSON.parse(stored);
      } catch (e) {
        console.warn("Erreur lecture profil financier local", e);
      }
    }

    // 2. Prêts en cours pour mensualités existantes (API + LocalStorage)
    let totalMensualitesPrets = 0;
    try {
      const { data: prets } = await client.get("/historique-prets/");
      totalMensualitesPrets += (prets || [])
        .filter((p) => p.statut === "en_cours")
        .reduce((sum, p) => sum + (p.mensualite || 0), 0);
    } catch (e) {
      console.warn("Erreur chargement prêts en cours API pour IA", e);
    }

    if (user?.id) {
      try {
        const storedPrets = localStorage.getItem(`credisense_prets_${user.id}`);
        if (storedPrets) {
          const customPrets = JSON.parse(storedPrets);
          totalMensualitesPrets += (customPrets || [])
            .filter((p) => p.statut === "en_cours")
            .reduce((sum, p) => sum + (p.mensualite || 0), 0);
        }
      } catch (e) {
        console.warn("Erreur chargement prêts locaux pour IA", e);
      }
    }

    try {
      const { data } = await client.post("/ia/recommandation", {
        revenu_mensuel: Number(revenu),
        apport: Number(apport),
        montant_souhaite: dernierePayload.montant,
        duree_mois: dernierePayload.duree_mois,
        offre_id: dernierePayload.offre_id,
        projet: projet || null,
        profession: profilLocal.profession || null,
        charges_mensuelles: Number(profilLocal.charges) || 0,
        total_mensualites_prets_en_cours: totalMensualitesPrets,
      });
      setRecommandation(data.contenu_reponse);
      // Persist updated recommendation
      localStorage.setItem(
        "simulationResult",
        JSON.stringify({
          resultat,
          offreSelectionneeId: offreSelectionnee?.id ?? null,
          recommandation: data.contenu_reponse,
        })
      );
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Impossible d’obtenir une recommandation pour le moment.";
      setErreurIA(msg);
    } finally {
      setChargementIA(false);
    }
  }, [revenu, apport, projet, dernierePayload, offreSelectionnee, resultat, user]);

  // Memoized derived values
  const fraisDossier = useMemo(() => {
    if (!offreSelectionnee || !dernierePayload?.montant) return 0;
    return Math.round(
      dernierePayload.montant * offreSelectionnee.frais_dossier_pct
    );
  }, [offreSelectionnee, dernierePayload?.montant]);

  const assuranceMensuelle = useMemo(() => {
    if (!offreSelectionnee || !dernierePayload?.montant) return 0;
    return Math.round(
      (dernierePayload.montant * offreSelectionnee.assurance_pct_an) / 12
    );
  }, [offreSelectionnee, dernierePayload?.montant]);

  // Helper to check if form can be submitted
  const canSubmit = offres.length > 0;
  const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-white/20 bg-indigo/80 px-6 py-7 shadow-lg backdrop-blur-sm">
        <p className="eyebrow mb-2">Calcul</p>
        <h1 className="section-titre">Evaluer un crédit</h1>
        <p className="mt-2 max-w-xl text-white/80">
          Estimez votre mensualité, visualisez le coût réel et vérifiez votre
          capacité d'emprunt.
        </p>
        <ol className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
          {["1. Paramètres", "2. Résultat", "3. Décision"].map((etape, index) => (
            <li key={etape} className={`rounded-full px-3 py-1.5 ${index === 0 || resultat ? "bg-or text-indigo" : "bg-white/10 text-white/70"}`}>
              {etape}
            </li>
          ))}
        </ol>
      </div>

      {/* Global alerts (optional) */}
      {erreurOffres && (
        <p className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          {erreurOffres}
        </p>
      )}
      {erreurSimulation && (
        <p className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          {erreurSimulation}
        </p>
      )}
      {erreurIA && (
        <p className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          {erreurIA}
        </p>
      )}

      {/* Main layout */}
      <div className="space-y-8">
        <CapaciteEmprunt />

        {/* Form column */}
        <div className={resultat ? "hidden" : "space-y-6"}>
          <FormulaireSimulation
            offres={offres}
            onSubmit={handleSubmit}
            chargement={chargementSimulation}
            disabled={!canSubmit}
            initialOffreId={urlOffreId}
            initialMontant={urlMontant}
            initialDuree={urlDuree}
          />
          {!canSubmit && (
            <p className="text-sm text-ardoise italic">
              Aucune offre disponible pour le moment.
            </p>
          )}
        </div>

        {/* Results column */}
        <div className="space-y-6">
          {/* Loading skeleton */}
          {chargementSimulation && <SkeletonCarte />}

          {!resultat && !chargementSimulation && (
            <p className="text-sm text-white/80">
              Remplissez le formulaire pour voir votre mensualité, le TAEG et le coût total de votre crédit.
            </p>
          )}

          {/* Results */}
          {resultat && (
            <>
              <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo to-indigo-dark p-6 text-white shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-or">Votre estimation</p>
                <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{offreSelectionnee?.nom_banque || resultat.nom_banque || "Votre crédit"}</h2>
                    <p className="mt-2 text-sm text-white/70">Mensualité estimée</p>
                    <p className="chiffres text-4xl font-bold text-or sm:text-5xl">{formateurFCFA.format(resultat.mensualite)} <span className="text-xl">FCFA</span></p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[320px]">
                    <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] uppercase text-white/60">TAEG</p><p className="mt-1 font-bold chiffres">{resultat.taeg?.toFixed(2)}%</p></div>
                    <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] uppercase text-white/60">Coût total</p><p className="mt-1 font-bold chiffres text-sm">{formateurFCFA.format(resultat.cout_total)} F</p></div>
                    <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] uppercase text-white/60">Durée</p><p className="mt-1 font-bold chiffres">{resultat.duree_mois} mois</p></div>
                  </div>
                </div>
                {offreSelectionnee?.taux_annuel !== undefined && (
                  <div className="mt-5 border-t border-white/15 pt-4"><InterpretationTAEG taeg={resultat.taeg} tauxAnnuel={offreSelectionnee.taux_annuel} dureeMois={resultat.duree_mois} /></div>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setResultat(null)} className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Modifier ma simulation</button>
                  <button type="button" onClick={() => navigate("/comparaison")} className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Comparer cette offre</button>
                  <button type="button" onClick={() => navigate("/mes-demandes", { state: { simulation: resultat } })} className="rounded-lg bg-or px-4 py-2.5 text-sm font-bold text-indigo hover:bg-amber-400">Déposer une demande →</button>
                </div>
              </section>

              <GraphiqueRepartition
                lignes={resultat.tableau_amortissement}
                fraisDossier={fraisDossier}
                assuranceMensuelle={assuranceMensuelle}
              />

              <section className="carte space-y-5 p-6">
                <div>
                  <p className="eyebrow mb-2">Analyse de votre capacité</p>
                  <h2 className="text-xl font-bold text-indigo">Votre équilibre financier</h2>
                </div>
                <ProfilFinancier
                  revenu={revenu}
                  apport={apport}
                  projet={projet}
                  onRevenuChange={setRevenu}
                  onApportChange={setApport}
                  onProjetChange={setProjet}
                  compact
                />
                <BadgeEndettement mensualite={resultat.mensualite} revenu={revenu} />
                <div className="rounded-xl border border-indigo/10 bg-indigo/5 p-5">
                  <p className="eyebrow mb-3">Conseil personnalisé</p>
                  {!recommandation && !chargementIA && (
                    <div className="space-y-3">
                      <p className="text-sm text-ardoise">Complétez votre profil financier pour obtenir une analyse adaptée à votre situation.</p>
                      <button type="button" onClick={demanderRecommandation} disabled={!revenu || !apport} className="btn-secondaire w-full sm:w-auto">Demander une recommandation IA</button>
                    </div>
                  )}
                  <RecommandationIA texte={recommandation} chargement={chargementIA} />
                </div>
              </section>

              {resultat.tableau_amortissement && (
                <details className="group rounded-xl border border-white/40 bg-white/80 p-1">
                  <summary className="cursor-pointer list-none px-5 py-4 font-bold text-indigo">Voir le tableau d'amortissement complet <span className="ml-2 text-or group-open:hidden">+</span><span className="ml-2 text-or hidden group-open:inline">−</span></summary>
                  <div className="px-1 pb-1"><TableauAmortissement lignes={resultat.tableau_amortissement} nomExport={`credit-${offreSelectionnee?.nom_banque || "credit"}`.replace(/\s+/g, "-")} /></div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
