import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    simulations: 0,
    demandes: 0,
    offres: 0,
    messagesIA: 0,
    utilisateurs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");
        const [
          simRes,
          demandeRes,
          offreRes,
          iaRes,
          userRes,
        ] = await Promise.all([
          client.get("/simulations/all").catch(() => ({ data: [] })),
          client.get("/demandes-credit/").catch(() => ({ data: [] })),
          client.get("/offres/").catch(() => ({ data: [] })),
          client.get("/admin/ia/").catch(() => ({ data: [] })),
          client.get("/users/").catch(() => ({ data: [] })),
        ]);

        setStats({
          simulations: simRes.data.length,
          demandes: demandeRes.data.length,
          offres: offreRes.data.length,
          messagesIA: iaRes.data.length,
          utilisateurs: userRes.data.length,
        });
      } catch (err) {
        console.error("Erreur lors du chargement des stats:", err);
        setError("Impossible de charger les statistiques");
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "admin") {
      fetchStats();
    }
  }, [user]);

  const cards = [
    {
      title: "Simulations",
      count: stats.simulations,
      icon: "📊",
      path: "/admin/simulations",
      desc: "Consulter la liste et le détail de toutes les simulations calculées.",
      color: "border-l-indigo text-indigo",
    },
    {
      title: "Demandes de Crédit",
      count: stats.demandes,
      icon: "📝",
      path: "/admin/demandes-credit",
      desc: "Examiner, approuver ou refuser les demandes soumises par les clients.",
      color: "border-l-or text-or",
    },
    {
      title: "Offres Bancaires",
      count: stats.offres,
      icon: "💰",
      path: "/admin/offres",
      desc: "Administrer les offres de prêts des banques partenaires.",
      color: "border-l-emerald-500 text-emerald-600",
    },
    {
      title: "Recommandations IA",
      count: stats.messagesIA,
      icon: "🤖",
      path: "/admin/ia",
      desc: "Superviser les réponses générées par l'agent conseiller IA.",
      color: "border-l-purple-500 text-purple-600",
    },
    {
      title: "Gestion Utilisateurs",
      count: stats.utilisateurs,
      icon: "👥",
      path: "/admin/utilisateurs",
      desc: "Gérer les rôles des utilisateurs (Client, Conseiller, Admin).",
      color: "border-l-blue-500 text-blue-600",
    },
    {
      title: "Configuration",
      count: "Système",
      icon: "⚙️",
      path: "/admin/config",
      desc: "Ajuster les paramètres globaux et variables de calcul.",
      color: "border-l-slate-500 text-slate-700",
    },
    {
      title: "Journal d'Audit",
      count: "Sécurité",
      icon: "📋",
      path: "/admin/audit",
      desc: "Historique traçable de toutes les actions d'administration.",
      color: "border-l-amber-500 text-amber-700",
    },
  ];

  if (loading) return <p className="text-center py-12 text-ardoise font-medium">Chargement du tableau de bord...</p>;
  if (error) return <p className="text-red-600 text-center py-12">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-ardoise/20 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-indigo">Bienvenue, {user?.nom || "Administrateur"}</h2>
          <p className="text-ardoise text-xs mt-1">
            Voici la vue d'ensemble de l'activité du système et vos accès rapides aux modules de gestion.
          </p>
        </div>
        <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full whitespace-nowrap">
          ● Système Opérationnel
        </span>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className={`bg-white rounded-xl border border-ardoise/20 border-l-4 ${card.color} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{card.icon}</span>
                <span className="text-2xl font-bold text-indigo">{card.count}</span>
              </div>
              <h2 className="text-lg font-bold text-indigo group-hover:text-or transition-colors">{card.title}</h2>
              <p className="text-xs text-ardoise mt-1.5 leading-relaxed">{card.desc}</p>
            </div>
            
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo group-hover:text-or">
              <span>Accéder à la section</span>
              <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}