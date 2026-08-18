import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminDemandesCredit() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      setError("");
      const { data: resp } = await client.get("/demandes-credit/");
      setData(resp);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les demandes de crédit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDemandes();
    }
  }, [user]);

  const changerStatutDemande = async (id, nouveauStatut) => {
    setActionId(id);
    try {
      await client.patch(`/demandes-credit/${id}`, { statut: nouveauStatut });
      setData((prev) =>
        prev.map((d) => (d.id === id ? { ...d, statut: nouveauStatut } : d))
      );
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
      alert(err.response?.data?.detail || "Impossible de modifier le statut");
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement des demandes...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
  if (data.length === 0)
    return <p className="text-center text-ardoise py-8">Aucune demande trouvée.</p>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo">Toutes les demandes de crédit</h1>
        <span className="text-xs bg-slate-100 text-ardoise font-semibold px-3 py-1 rounded-full">
          Total: {data.length}
        </span>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-ardoise/20 shadow-sm">
        <table className="min-w-full divide-y divide-ardoise/20">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Montant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Durée</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Apport</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-indigo font-medium">{d.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm text-ardoise">{d.user_id?.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm font-semibold text-indigo">
                  {d.montant_demande ? d.montant_demande.toLocaleString("fr-FR") : d.montant || 0} FCFA
                </td>
                <td className="px-4 py-3 text-sm">{d.duree_souhaite || d.duree_souhaitee} mois</td>
                <td className="px-4 py-3 text-sm text-ardoise">{d.apport ? `${d.apport.toLocaleString("fr-FR")} F` : "0 F"}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      d.statut === "en_attente"
                        ? "bg-amber-100 text-amber-800"
                        : d.statut === "approuvee"
                        ? "bg-emerald-100 text-emerald-800"
                        : d.statut === "refusee"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {d.statut === "en_attente"
                      ? "En attente"
                      : d.statut === "approuvee"
                      ? "Approuvée"
                      : d.statut === "refusee"
                      ? "Refusée"
                      : d.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ardoise whitespace-nowrap">
                  {d.date_creation ? new Date(d.date_creation).toLocaleDateString("fr-FR") : "N/A"}
                </td>
                <td className="px-4 py-3 text-sm space-x-2 whitespace-nowrap">
                  {actionId === d.id ? (
                    <span className="text-xs text-ardoise animate-pulse">Traitement...</span>
                  ) : (
                    <>
                      {d.statut !== "approuvee" && (
                        <button
                          onClick={() => changerStatutDemande(d.id, "approuvee")}
                          className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-emerald-700 transition-colors"
                        >
                          Approuver
                        </button>
                      )}
                      {d.statut !== "refusee" && (
                        <button
                          onClick={() => changerStatutDemande(d.id, "refusee")}
                          className="bg-rose-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-rose-700 transition-colors"
                        >
                          Refuser
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center">
        <Link to="/admin" className="text-indigo hover:text-or font-medium text-sm">
          ← Retour au Tableau de bord
        </Link>
      </p>
    </div>
  );
}
