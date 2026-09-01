import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, user, estConnecte } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  // Déterminer l'URL de redirection cible (si l'utilisateur venait d'un CTA spécifique)
  const targetRedirect = searchParams.get("redirect") || location.state?.from || "/dashboard";

  // Si déjà connecté, rediriger automatiquement vers la destination voulue
  useEffect(() => {
    if (estConnecte && user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate(targetRedirect);
      }
    }
  }, [user, estConnecte, navigate, targetRedirect]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const loggedUser = await login(email, password);
      const destination = loggedUser?.role === "admin" ? "/admin" : targetRedirect;
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Erreur de connexion:", err);
      setErreur(
        err.response?.data?.detail || "Email ou mot de passe incorrect. Veuillez vérifier vos accès."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 animate-slide-up">
      <div className="carte p-8 sm:p-10 border-t-4 border-t-or shadow-lg">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-14 w-auto logo-frame logo-glow mb-3" />
          <span className="eyebrow mb-1">Espace Client CCA Bank</span>
          <h1 className="text-3xl font-bold text-indigo">Connexion</h1>
          <p className="text-ardoise text-xs mt-1">
            Connectez-vous pour finaliser la simulation de votre crédit.
          </p>
        </div>

        {searchParams.get("redirect") && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">
            🔒 Veuillez vous connecter pour accéder directement au simulateur pré-sélectionné.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              className="champ"
              placeholder="ex. client@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-ardoise uppercase tracking-wider">
                Mot de passe
              </label>
            </div>
            <input
              id="password"
              type="password"
              required
              className="champ"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter & continuer →</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-ardoise">
          <p>
            Vous n'avez pas encore de compte ?{" "}
            <Link
              to={`/register${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect"))}` : ""}`}
              className="text-indigo font-bold hover:text-or transition-colors underline"
            >
              Créer un compte client
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
