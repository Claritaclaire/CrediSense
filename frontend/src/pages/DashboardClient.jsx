import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function DashboardClient() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [derniereSimulation, setDerniereSimulation] = useState(null);
  const [pretsEnCours, setPretsEnCours] = useState([]);
  const [profilFinancier, setProfilFinancier] = useState({
    revenu: 0,
    charges: 0,
    profession: "",
  });

  useEffect(() => {
    // Charger le profil financier local s'il existe
    const storedProfil = localStorage.getItem(`credisense_profil_${user?.id}`);
    if (storedProfil) {
      try {
        setProfilFinancier(JSON.parse(storedProfil));
      } catch (e) {
        console.error(e);
      }
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Récupérer la dernière simulation et les prêts
        const [simRes, pretRes] = await Promise.all([
          client.get("/simulations/all").catch(() => ({ data: [] })),
          client.get("/historique-prets/").catch(() => ({ data: [] })),
        ]);

        if (Array.isArray(simRes.data) && simRes.data.length > 0) {
          setDerniereSimulation(simRes.data[simRes.data.length - 1]);
        }

        if (Array.isArray(pretRes.data)) {
          setPretsEnCours(pretRes.data.filter((p) => p.statut === "en_cours"));
        }
      } catch (err) {
        console.error("Erreur chargement dashboard client:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculs financiers
  const totalMensualitesPrets = pretsEnCours.reduce(
    (acc, p) => acc + (p.mensualite || 0),
    0
  );
  const totalCharges = (profilFinancier.charges || 0) + totalMensualitesPrets;
  const revenuMensuel = profilFinancier.revenu || 0;

  const tauxEndettement =
    revenuMensuel > 0
      ? Math.min(100, Math.round((totalCharges / revenuMensuel) * 100))
      : 0;

  let couleurTaux = "text-emerald-600 bg-emerald-50 border-emerald-300";
  let statutTaux = "Capacité d'emprunt optimale (< 33%)";
  if (tauxEndettement >= 33 && tauxEndettement <= 40) {
    couleurTaux = "text-amber-600 bg-amber-50 border-amber-300";
    statutTaux = "Seuil d'attention atteint (33% - 40%)";
  } else if (tauxEndettement > 40) {
    couleurTaux = "text-rose-600 bg-rose-50 border-rose-300";
    statutTaux = "Capacité limitée (> 40%)";
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* En-tête de bienvenue */}
      <div className="carte p-6 sm:p-8 bg-gradient-to-br from-indigo via-indigo-dark to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="eyebrow bg-or/20 text-or border-or/30 font-bold px-3 py-1 text-xs">
            Tableau de Bord Client CCA Bank
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white mt-2">
            Bonjour, {user?.nom || "Cher Client"} 👋
          </h1>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Retrouvez en un coup d'œil vos indicateurs financiers, vos simulations récentes et vos prêts en cours.
          </p>
        </div>

        <Link
          to="/simulation"
          className="bg-or text-indigo font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-400 hover:scale-105 transition-all text-sm whitespace-nowrap shrink-0"
        >
          + Nouvelle Simulation →
        </Link>
      </div>

      {/* Cartes d'indicateurs financiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Taux d'endettement */}
        <div className="carte p-6 space-y-4 border-l-4 border-l-or">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-ardoise uppercase tracking-wider">
              Taux d'endettement
            </span>
            <span className="text-2xl">⚖️</span>
          </div>

          <div>
            <div className="text-3xl font-extrabold text-indigo font-display">
              {revenuMensuel > 0 ? `${tauxEndettement}%` : "Non renseigné"}
            </div>
            <p className="text-xs text-ardoise mt-1">
              {revenuMensuel > 0
                ? statutTaux
                : "Renseignez vos revenus dans votre Profil"}
            </p>
          </div>

          {/* Jauge visuelle */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                tauxEndettement > 40
                  ? "bg-rose-500"
                  : tauxEndettement >= 33
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, tauxEndettement))}%` }}
            />
          </div>

          <Link
            to="/profil"
            className="inline-block text-xs font-semibold text-or hover:underline pt-1"
          >
            Ajuster mes revenus & charges →
          </Link>
        </div>

        {/* Prêts en cours */}
        <div className="carte p-6 space-y-4 border-l-4 border-l-indigo">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-ardoise uppercase tracking-wider">
              Prêts en cours
            </span>
            <span className="text-2xl">💳</span>
          </div>

          <div>
            <div className="text-3xl font-extrabold text-indigo font-display">
              {pretsEnCours.length} <span className="text-sm font-normal text-ardoise">prêt(s)</span>
            </div>
            <p className="text-xs text-ardoise mt-1">
              Mensualité totale :{" "}
              <strong className="text-indigo">
                {totalMensualitesPrets.toLocaleString("fr-FR")} FCFA
              </strong>
            </p>
          </div>

          <Link
            to="/profil"
            className="inline-block text-xs font-semibold text-indigo hover:underline pt-1"
          >
            Gérer mes prêts en cours →
          </Link>
        </div>

        {/* Dernière simulation */}
        <div className="carte p-6 space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-ardoise uppercase tracking-wider">
              Dernière Simulation
            </span>
            <span className="text-2xl">📊</span>
          </div>

          {derniereSimulation ? (
            <div>
              <div className="text-2xl font-extrabold text-indigo font-display">
                {derniereSimulation.montant?.toLocaleString("fr-FR")} FCFA
              </div>
              <p className="text-xs text-ardoise mt-1">
                Mensualité :{" "}
                <strong className="text-emerald-700">
                  {Math.round(derniereSimulation.mensualite || 0).toLocaleString("fr-FR")} FCFA/mois
                </strong>{" "}
                ({derniereSimulation.duree_mois} mois)
              </p>
            </div>
          ) : (
            <p className="text-xs text-ardoise">Aucune simulation enregistrée pour le moment.</p>
          )}

          <Link
            to="/simulation"
            className="inline-block text-xs font-semibold text-emerald-700 hover:underline pt-1"
          >
            Lancer un calcul personnalisé →
          </Link>
        </div>
      </div>

      {/* Grille des raccourcis d'action */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Raccourcis & Modules Client</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/simulation"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-or"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Simuler un nouveau crédit
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Calculez au franc près vos mensualités, frais et tableau d'amortissement.
            </p>
          </Link>

          <Link
            to="/comparaison"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-indigo"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Comparer les offres
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Comparez côte à côte plusieurs formules de prêt pour choisir la plus avantageuse.
            </p>
          </Link>

          <Link
            to="/profil"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-amber-500"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              👤
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Mon Profil & Finances
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Renseignez vos revenus et charges pour réutiliser ces données automatiquement.
            </p>
          </Link>

          <Link
            to="/profil"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-purple-500"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              💳
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Mes Prêts en cours
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Déclarez vos crédits actuels pour ajuster le calcul de votre taux d'endettement.
            </p>
          </Link>

          <Link
            to="/historique"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-blue-500"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              📜
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Historique des calculs
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Retrouvez l'ensemble de vos simulations sauvegardées et téléchargez vos bilans.
            </p>
          </Link>

          <Link
            to="/clause"
            className="carte p-6 hover:-translate-y-1 transition-all duration-200 group border-l-4 border-l-emerald-500"
          >
            <div className="text-3xl mb-3 p-2.5 bg-slate-50 rounded-xl inline-block group-hover:scale-110 transition-transform">
              🤖
            </div>
            <h3 className="font-bold text-indigo text-lg group-hover:text-or transition-colors">
              Explication de Clause IA
            </h3>
            <p className="text-ardoise text-xs mt-1 leading-relaxed">
              Soumettez le texte d'un contrat de prêt pour obtenir une vulgarisation claire en langage simple.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
