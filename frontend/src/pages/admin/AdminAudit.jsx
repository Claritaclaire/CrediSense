import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminAudit() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: resp } = await client.get("/admin/audit/");
        setLogs(resp);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger le journal d'audit");
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === "admin") {
      fetchLogs();
    }
  }, [user]);

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement du journal d'audit...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
  if (logs.length === 0)
    return <p className="text-center text-ardoise py-8">Aucun journal d'audit trouvé.</p>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4 text-indigo">Journal d'audit des administrateurs</h1>
      
      <div className="overflow-x-auto bg-white rounded-lg border border-ardoise/20 shadow-sm">
        <table className="min-w-full divide-y divide-ardoise/20">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Admin (ID)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Table cible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">ID cible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Détails</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-indigo font-medium">{l.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm text-ardoise">{l.admin_id?.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-800 rounded">
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ardoise">{l.target_table || "-"}</td>
                <td className="px-4 py-3 text-sm text-ardoise">{l.target_id || "-"}</td>
                <td className="px-4 py-3 text-sm text-ardoise max-w-xs truncate">
                  {l.details ? l.details : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-ardoise whitespace-nowrap">
                  {l.timestamp ? new Date(l.timestamp).toLocaleString("fr-FR") : "N/A"}
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
