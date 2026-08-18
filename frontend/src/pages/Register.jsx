import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const targetRedirect = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await register(nom, email, password);
      navigate(targetRedirect);
    } catch (err) {
      console.error("Erreur d'inscription:", err);
      setErreur(
        err.response?.data?.detail || "Impossible de créer le compte. Cet email est peut-être déjà utilisé."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 animate-slide-up">
      <div className="carte p-8 sm:p-10 border-t-4 border-t-indigo shadow-lg">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-14 w-auto logo-frame logo-glow mb-3" />
          <span className="eyebrow mb-1">Inscription Gratuite</span>
          <h1 className="text-3xl font-bold text-indigo">Créer un compte</h1>
          <p className="text-ardoise text-xs mt-1">
            Simulez vos emprunts et enregistrez vos projets en quelques secondes.
          </p>
        </div>

        {searchParams.get("redirect") && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">
            🔒 Inscription requise pour accéder au calcul personnalisé de votre prêt.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="nom" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
              Nom complet
            </label>
            <input
              id="nom"
              type="text"
              required
              className="champ"
              placeholder="ex. Jean Dupont"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              className="champ"
              placeholder="ex. jean.dupont@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="champ"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-ardoise/70 mt-1">Au moins 6 caractères.</p>
          </div>

          {erreur && (
            <div className="alerte-erreur animate-fade-in">
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="btn-primaire w-full flex items-center justify-center gap-2 group"
          >
            {chargement ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Inscription en cours...</span>
              </>
            ) : (
              <>
                <span>Créer mon compte & continuer →</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-ardoise">
          <p>
            Vous avez déjà un compte ?{" "}
            <Link
              to={`/login${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect"))}` : ""}`}
              className="text-indigo font-bold hover:text-or transition-colors underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
