import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";

export default function AdminOffreEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    nom_banque: "",
    categorie_client: "particulier",
    taux_annuel: 0,
    duree_min_mois: 0,
    duree_max_mois: 0,
    frais_dossier_pct: 0,
    assurance_pct_an: 0,
    montant_max: 0,
  });

  useEffect(() => {
    if (!id) {
      setError("ID d'offre manquant");
      setLoading(false);
      return;
    }
    const fetchOffre = async () => {
      try {
        setLoading(true);
        setError("");
        const { data: resp } = await client.get(`/offres/${id}`);
        setOffre(resp);
        // Initialize form with fetched data
        setForm({
          nom_banque: resp.nom_banque,
          categorie_client: resp.categorie_client || "particulier",
          taux_annuel: resp.taux_annuel,
          duree_min_mois: resp.duree_min_mois,
          duree_max_mois: resp.duree_max_mois,
          frais_dossier_pct: resp.frais_dossier_pct,
          assurance_pct_an: resp.assurance_pct_an,
          montant_max: resp.montant_max,
        });
      } catch (err) {
        console.error(err);
        setError("Impossible de charger l'offre");
      } finally {
        setLoading(false);
      }
    };
    if (user && user.role === "admin") {
      fetchOffre();
    }
  }, [id, user]);

  if (loading) return <p className="text-center py-8 text-ardoise">Chargement de l'offre...</p>;
  if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
  if (!offre) return <p className="text-center text-ardoise py-8">Offre introuvable.</p>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Parse numeric fields
    let parsed = value;
    if (name !== "nom_banque" && name !== "categorie_client") {
      parsed = parseFloat(value);
      if (isNaN(parsed)) parsed = 0;
    }
    setForm((prev) => ({ ...prev, [name]: parsed }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitLoading(true);
    try {
      // Send PATCH with only fields that have changed? For simplicity send whole form.
      await client.patch(`/offres/${id}`, form);
      setSuccess("Offre mise à jour avec succès !");
      // Optionally redirect after a short delay
      setTimeout(() => {
        navigate("/admin/offres");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la mise à jour de l'offre");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-indigo">Modifier l'offre de crédit</h1>
        <Link to="/admin/offres" className="text-indigo hover:text-or font-medium">
          ← Retour à la liste
        </Link>
      </div>

      {success && <p className="mb-4 text-green-600 text-center">{success}</p>}
      {error && <p className="mb-4 text-red-600 text-center">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-ardoise/20 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-ardoise mb-1">Nom de la banque</label>
          <input
            type="text"
            name="nom_banque"
            value={form.nom_banque}
            onChange={handleChange}
            className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ardoise mb-1">Catégorie de client</label>
          <select name="categorie_client" value={form.categorie_client} onChange={handleChange} className="champ" required>
            <option value="particulier">Particulier</option>
            <option value="professionnel">Entreprise / professionnel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ardoise mb-1">Taux annuel (%)</label>
          <input
            type="number"
            step="0.01"
            name="taux_annuel"
            value={form.taux_annuel}
            onChange={handleChange}
            className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ardoise mb-1">Durée minimale (mois)</label>
            <input
              type="number"
              name="duree_min_mois"
              value={form.duree_min_mois}
              onChange={handleChange}
              className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ardoise mb-1">Durée maximale (mois)</label>
            <input
              type="number"
              name="duree_max_mois"
              value={form.duree_max_mois}
              onChange={handleChange}
              className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ardoise mb-1">Montant maximum (FCFA)</label>
          <input
            type="number"
            step="0.01"
            name="montant_max"
            value={form.montant_max}
            onChange={handleChange}
            className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="0"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ardoise mb-1">Frais de dossier (%)</label>
            <input
              type="number"
              step="0.01"
              name="frais_dossier_pct"
              value={form.frais_dossier_pct}
              onChange={handleChange}
              className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ardoise mb-1">Assurance (%/an)</label>
            <input
              type="number"
              step="0.01"
              name="assurance_pct_an"
              value={form.assurance_pct_an}
              onChange={handleChange}
              className="champ w-full px-3 py-2 border border-ardoise/30 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="0"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitLoading}
            className="btn-primaire px-4 py-2 text-sm flex items-center gap-2"
          >
            {submitLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mise à jour…</span>
              </>
            ) : (
              <>
                <span>Enregistrer les modifications</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-ardoise">
        Les champs marqués d’un astérisque (*) sont obligatoires.
      </p>
    </div>
  );
}
