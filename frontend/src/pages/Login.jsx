import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, completerConnexion2FA, user, estConnecte } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  // Etape 2 : code a 6 chiffres, une fois le mot de passe accepte sur un
  // compte ayant le 2FA actif.
  const [tempToken, setTempToken] = useState(null);
  const [code2FA, setCode2FA] = useState("");

  // Déterminer l'URL de redirection cible (si l'utilisateur venait d'un CTA spécifique)
  const targetRedirect = searchParams.get("redirect") || location.state?.from || "/dashboard";

  // Si déjà connecté, rediriger automatiquement vers la destination voulue
  useEffect(() => {
    if (estConnecte && user) {
      if (user.role === "admin_systeme") {
        navigate("/administration-systeme");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate(targetRedirect);
      }
    }
  }, [user, estConnecte, navigate, targetRedirect]);

  function redirigerSelonRole(loggedUser) {
    const destination = loggedUser?.role === "admin_systeme"
      ? "/administration-systeme"
      : loggedUser?.role === "admin"
        ? "/admin"
        : targetRedirect;
    navigate(destination, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const resultat = await login(email, password);
      if (resultat.requires2FA) {
        setTempToken(resultat.tempToken);
      } else {
        redirigerSelonRole(resultat.user);
      }
    } catch (err) {
      console.error("Erreur de connexion:", err);
      setErreur(
        err.response?.data?.detail || "Email ou mot de passe incorrect. Veuillez vérifier vos accès."
      );
    } finally {
      setChargement(false);
    }
  }

  async function handleSubmit2FA(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const loggedUser = await completerConnexion2FA(tempToken, code2FA);
      redirigerSelonRole(loggedUser);
    } catch (err) {
      console.error("Erreur de vérification 2FA:", err);
      setErreur(err.response?.data?.detail || "Code de vérification incorrect.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 animate-slide-up">
      <div className="carte p-5 sm:p-7 border-t-4 border-t-or shadow-lg">
        <div className="text-center mb-5 flex flex-col items-center">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-12 w-auto logo-frame logo-glow mb-2" />
          <span className="eyebrow mb-1">Espace Client CCA Bank</span>
          <h1 className="text-2xl font-bold text-indigo">Connexion</h1>
          <p className="text-ardoise text-xs mt-1">
            Connectez-vous pour finaliser la simulation de votre crédit.
          </p>
        </div>

        {searchParams.get("redirect") && !tempToken && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold">
            🔒 Veuillez vous connecter pour accéder directement au simulateur pré-sélectionné.
          </div>
        )}

        {!tempToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
        ) : (
          <form onSubmit={handleSubmit2FA} className="space-y-4">
            <div className="p-3 bg-indigo/5 border border-indigo/20 rounded-lg text-xs text-indigo font-semibold">
              🔐 Ce compte est protégé par la double authentification. Ouvrez votre application d'authentification et saisissez le code affiché.
            </div>
            <div>
              <label htmlFor="code2fa" className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1.5">
                Code à 6 chiffres
              </label>
              <input
                id="code2fa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="champ text-center text-2xl tracking-[0.5em] font-bold chiffres"
                placeholder="000000"
                value={code2FA}
                onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </div>

            {erreur && (
              <div className="alerte-erreur animate-fade-in">
                {erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={chargement || code2FA.length !== 6}
              className="btn-primaire w-full flex items-center justify-center gap-2 group"
            >
              {chargement ? "Vérification..." : "Vérifier le code →"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTempToken(null);
                setCode2FA("");
                setErreur("");
              }}
              className="w-full text-center text-xs text-ardoise hover:text-indigo underline"
            >
              ← Revenir à la connexion
            </button>
          </form>
        )}

        {!tempToken && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-ardoise">
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
        )}
      </div>
    </div>
  );
}
