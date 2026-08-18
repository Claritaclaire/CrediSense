import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function OffreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { estConnecte } = useAuth();

  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  // Exemple interactif
  const [montantExemple, setMontantExemple] = useState(1000000);
  const [dureeExemple, setDureeExemple] = useState(24);

  useEffect(() => {
    const fetchOffre = async () => {
      try {
        setLoading(true);
        const { data } = await client.get(`/offres/${id}`);
        setOffre(data);
        setMontantExemple(Math.min(data.montant_max || 2000000, 1000000));
        setDureeExemple(Math.min(data.duree_max_mois || 36, 24));
      } catch (err) {
        console.error("Erreur chargement offre:", err);
        setErreur("L'offre demandée n'a pas pu être trouvée.");
      } finally {
        setLoading(false);
      }
    };
    fetchOffre();
  }, [id]);

  // Calcul d'exemple simplifié
  const calculMensualiteIndicative = () => {
    if (!offre) return 0;
    const r = (offre.taux_annuel / 100) / 12;
    const n = dureeExemple;
    if (r === 0) return Math.round(montantExemple / n);
    const m = (montantExemple * r) / (1 - Math.pow(1 + r, -n));
    return Math.round(m);
  };

  const handleLancerSimulation = () => {
    const targetUrl = `/simulation?offre_id=${id}&montant=${montantExemple}&duree=${dureeExemple}`;
    if (estConnecte) {
      navigate(targetUrl);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-white font-medium animate-pulse">
        Chargement des détails de l'offre CCA Bank...
      </div>
    );
  }

  if (erreur || !offre) {
    return (
      <div className="carte p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <h2 className="text-xl font-bold text-rose-700">Offre introuvable</h2>
        <p className="text-ardoise text-sm">{erreur || "Cette offre n'existe pas ou a été retirée."}</p>
        <Link to="/" className="btn-secondaire inline-block text-sm">
          ← Retour aux offres de la banque
        </Link>
      </div>
    );
  }

  const mensualiteExemple = calculMensualiteIndicative();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Fil d'ariane */}
      <nav className="text-xs text-white/70 flex items-center gap-2">
        <Link to="/" className="hover:text-or transition-colors">Accueil</Link>
        <span>/</span>
        <span className="text-or font-semibold">{offre.nom_banque}</span>
      </nav>

      {/* Hero Offre */}
      <div className="carte p-6 sm:p-10 border-l-8 border-l-or bg-gradient-to-br from-white via-slate-50 to-amber-50/20 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="eyebrow mb-2">Offre de Crédit CCA Bank</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-indigo">
              {offre.nom_banque}
            </h1>
            <p className="text-ardoise text-sm mt-1">
              Solution bancaire sur mesure adaptée à vos projets en Zone FCFA.
            </p>
          </div>
          <div className="bg-indigo text-white px-5 py-3 rounded-2xl text-center shadow-md">
            <span className="block text-xs uppercase tracking-wider text-or font-bold">Taux Nominal</span>
            <span className="text-3xl font-extrabold font-display">{offre.taux_annuel} %</span>
          </div>
        </div>

        {/* Grille de caractéristiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <span className="block text-xs text-ardoise font-medium uppercase">Montant Max</span>
            <span className="text-lg font-bold text-indigo font-display">
              {offre.montant_max.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <span className="block text-xs text-ardoise font-medium uppercase">Durée Possible</span>
            <span className="text-lg font-bold text-indigo font-display">
              {offre.duree_min_mois} à {offre.duree_max_mois} mois
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <span className="block text-xs text-ardoise font-medium uppercase">Frais de Dossier</span>
            <span className="text-lg font-bold text-indigo font-display">
              {offre.frais_dossier_pct} %
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
            <span className="block text-xs text-ardoise font-medium uppercase">Assurance / an</span>
            <span className="text-lg font-bold text-indigo font-display">
              {offre.assurance_pct_an} %
            </span>
          </div>
        </div>
      </div>

      {/* Démonstration d'exemple interactif */}
      <div className="carte p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-indigo">Simulateur d'exemple indicatif</h2>
          <p className="text-ardoise text-xs mt-1">
            Ajustez le montant et la durée pour estimer votre mensualité indicative avant de personnaliser avec vos chiffres réels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-semibold text-indigo mb-2">
                <span>Montant du crédit :</span>
                <span className="text-or font-bold text-base">{montantExemple.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <input
                type="range"
                min={100000}
                max={offre.montant_max}
                step={50000}
                value={montantExemple}
                onChange={(e) => setMontantExemple(Number(e.target.value))}
                className="w-full accent-or cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-indigo mb-2">
                <span>Durée de remboursement :</span>
                <span className="text-or font-bold text-base">{dureeExemple} mois</span>
              </div>
              <input
                type="range"
                min={offre.duree_min_mois}
                max={offre.duree_max_mois}
                step={3}
                value={dureeExemple}
                onChange={(e) => setDureeExemple(Number(e.target.value))}
                className="w-full accent-or cursor-pointer"
              />
            </div>
          </div>

          {/* Result Box */}
          <div className="bg-indigo text-white p-6 rounded-2xl text-center space-y-3 shadow-lg border border-or/30">
            <span className="text-xs uppercase tracking-widest text-or font-bold">Mensualité Estimée</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-display">
              {mensualiteExemple.toLocaleString("fr-FR")} <span className="text-lg text-or">FCFA/mois</span>
            </div>
            <p className="text-xs text-white/70">
              *Taux nominal de {offre.taux_annuel}%. Hors frais d'assurance ajustés.
            </p>
          </div>
        </div>

        {/* CTA Principal */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-ardoise">
            {!estConnecte && (
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                🔒 Inscription gratuite requise pour sauvegarder le calcul et générer le tableau d'amortissement.
              </span>
            )}
          </div>

          <button
            onClick={handleLancerSimulation}
            className="w-full sm:w-auto bg-or text-indigo font-bold text-base px-8 py-3.5 rounded-xl shadow-lg hover:bg-amber-400 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <span>Simuler ce produit avec mes chiffres</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
