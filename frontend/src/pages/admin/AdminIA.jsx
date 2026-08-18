import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminIA() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchIA = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: resp } = await client.get("/admin/ia/");
        setData(resp);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger l'historique des messages IA");
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === "admin") {
      fetchIA();
    }
  }, [user]);

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement des messages IA...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
  if (data.length === 0)
    return <p className="text-center text-ardoise py-8">Aucun message IA trouvé.</p>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4 text-indigo">Historique des messages IA</h1>
      
      <div className="overflow-x-auto bg-white rounded-lg border border-ardoise/20 shadow-sm">
        <table className="min-w-full divide-y divide-ardoise/20">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Extrait demande
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Extrait réponse
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-indigo font-medium">{m.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo/10 text-indigo rounded">
                    {m.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ardoise max-w-xs truncate">
                  {m.contenu_entree}
                </td>
                <td className="px-4 py-3 text-sm text-ardoise max-w-xs truncate">
                  {m.contenu_reponse}
                </td>
                <td className="px-4 py-3 text-sm text-ardoise whitespace-nowrap">
                  {m.timestamp ? new Date(m.timestamp).toLocaleDateString("fr-FR") : "N/A"}
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
