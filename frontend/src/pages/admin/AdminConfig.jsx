import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { Link } from "react-router-dom";

export default function AdminConfig() {
  const { user } = useAuth();
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: resp } = await client.get("/admin/config/");
        setParams(resp);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger la configuration système");
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === "admin") {
      fetchConfig();
    }
  }, [user]);

  const handleEdit = (p) => {
    setEditId(p.id);
    setEditValue(p.value);
    setEditDesc(p.description || "");
  };

  const handleSave = async () => {
    try {
      await client.patch(`/admin/config/${editId}`, {
        value: editValue,
        description: editDesc,
      });
      const { data: resp } = await client.get("/admin/config/");
      setParams(resp);
      setEditId(null);
      setEditValue("");
      setEditDesc("");
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la mise à jour");
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setEditValue("");
    setEditDesc("");
  };

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement de la configuration...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4 text-indigo">Paramètres système</h1>

      {editId !== null ? (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
          <h2 className="font-semibold mb-3 text-indigo">Modifier le paramètre</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ardoise mb-1">Valeur (JSON / String)</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="border border-ardoise/30 rounded px-3 py-1.5 w-full text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ardoise mb-1">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="border border-ardoise/30 rounded px-3 py-1.5 w-full text-sm bg-white"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={handleSave}
                className="bg-or text-indigo font-semibold px-4 py-1.5 text-sm rounded hover:bg-or/90 transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancel}
                className="border border-ardoise/30 text-ardoise px-4 py-1.5 text-sm rounded hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto bg-white rounded-lg border border-ardoise/20 shadow-sm">
        <table className="min-w-full divide-y divide-ardoise/20">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Clé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Valeur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Sensible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ardoise uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ardoise/10">
            {params.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-indigo">{p.key}</td>
                <td className="px-4 py-3 text-sm text-ardoise break-all max-w-xs">{p.value}</td>
                <td className="px-4 py-3 text-sm text-ardoise">{p.description || "-"}</td>
                <td className="px-4 py-3 text-sm text-ardoise">{p.is_sensitive ? "Oui" : "Non"}</td>
                <td className="px-4 py-3 text-sm space-x-3">
                  <button
                    onClick={() => handleEdit(p)}
                    className="text-indigo font-medium hover:text-or transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer le paramètre "${p.key}" ?`)) {
                        client.delete(`/admin/config/${p.id}`).then(() => {
                          setParams(params.filter((pp) => pp.id !== p.id));
                        });
                      }
                    }}
                    className="text-rose-600 font-medium hover:underline"
                  >
                    Supprimer
                  </button>
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
