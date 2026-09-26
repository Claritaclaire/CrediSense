import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";

export default function ReinitialiserMotDePasse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");

    if (!token) {
      setErreur("Lien de réinitialisation invalide. Refaites une demande depuis la page de connexion.");
      return;
    }
    if (motDePasse.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);
    try {
      await client.post("/auth/reinitialiser-mot-de-passe", {
        token,
        nouveau_mot_de_passe: motDePasse,
      });
      setSucces(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setErreur(err.response?.data?.detail || "Impossible de réinitialiser le mot de passe.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 animate-slide-up">
      <div className="carte p-5 sm:p-7 border-t-4 border-t-or shadow-lg">
        <div className="text-center mb-5 flex flex-col items-center">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-12 w-auto logo-frame logo-glow mb-2" />
          <span className="eyebrow mb-1">Réinitialisation</span>
          <h1 className="text-2xl font-bold text-indigo">Choisissez un nouveau mot de passe</h1>
        </div>

        {!token && (
          <div className="alerte-erreur mb-4">
            Ce lien est incomplet ou invalide. Refaites une demande depuis{" "}
            <Link to="/mot-de-passe-oublie" className="underline font-bold">la page mot de passe oublié</Link>.
          </div>
        )}

        {succes ? (
          <div className="p-4 bg-emerald-500/10 border-l-4 border-emerald-400 text-emerald-800 rounded-r-lg text-sm">
            ✓ Mot de passe réinitialisé avec succès ! Redirection vers la connexion...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nouveau" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                id="nouveau"
                type="password"
                required
                minLength={6}
                className="champ"
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <p className="text-xs text-ardoise/70 mt-1">Au moins 6 caractères.</p>
            </div>

            <div>
              <label htmlFor="confirmation" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmation"
                type="password"
                required
                className="champ"
                placeholder="••••••••"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>

            {erreur && <div className="alerte-erreur animate-fade-in">{erreur}</div>}

            <button
              type="submit"
              disabled={chargement || !token}
              className="btn-primaire w-full flex items-center justify-center gap-2"
            >
              {chargement ? "Réinitialisation..." : "Réinitialiser mon mot de passe →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
