import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminOffres() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: resp } = await client.get("/offres/");
        setData(resp);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger le catalogue d'offres");
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === "admin") {
      fetchOffres();
    }
  }, [user]);

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement des offres...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
  if (data.length === 0)
    return <p className="text-center text-ardoise py-8">Aucune offre trouvée.</p>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4 text-indigo">Catalogue des offres de crédit</h1>
      
      <div className="overflow-x-auto bg-white rounded-lg border border-ardoise/20 shadow-sm">
        <table className="min-w-full divide-y divide-ardoise/20">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Banque
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Catégorie</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Taux annuel (%)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Montant max (FCFA)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Durée min (mois)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Durée max (mois)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Frais dossier (%)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Assurance (%/an)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {data.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-indigo font-medium">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm font-semibold text-indigo">{o.nom_banque}</td>
                <td className="px-4 py-3 text-sm">{o.categorie_client === "professionnel" ? "Entreprise" : "Particulier"}</td>
                <td className="px-4 py-3 text-sm text-or font-semibold">{(o.taux_annuel * 100).toFixed(0)}%</td>
                <td className="px-4 py-3 text-sm">{o.montant_max?.toLocaleString("fr-FR")} F</td>
                <td className="px-4 py-3 text-sm">{o.duree_min_mois}</td>
                <td className="px-4 py-3 text-sm">{o.duree_max_mois}</td>
                <td className="px-4 py-3 text-sm">{o.frais_dossier_pct}%</td>
                <td className="px-4 py-3 text-sm">{o.assurance_pct_an}%</td>
                <td className="px-4 py-3 text-sm">
                  <Link to={`/admin/offres/${o.id}/edit`} className="text-indigo hover:text-or font-medium">
                    Modifier
                  </Link>
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
