import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [chargement, setChargement] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await client.post("/auth/mot-de-passe-oublie", { email });
      // Le backend renvoie toujours le meme message, que l'email existe ou non.
      setEnvoye(true);
    } catch (err) {
      setErreur(err.response?.data?.detail || "Une erreur est survenue, réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 animate-slide-up">
      <div className="carte p-5 sm:p-7 border-t-4 border-t-or shadow-lg">
        <div className="text-center mb-5 flex flex-col items-center">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-12 w-auto logo-frame logo-glow mb-2" />
          <span className="eyebrow mb-1">Mot de passe oublié</span>
          <h1 className="text-2xl font-bold text-indigo">Réinitialiser votre mot de passe</h1>
          <p className="text-ardoise text-xs mt-1">
            Indiquez votre adresse email, nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        {envoye ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border-l-4 border-emerald-400 text-emerald-800 rounded-r-lg text-sm">
              ✓ Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé. Vérifiez votre boîte de réception (et vos spams).
            </div>
            <Link to="/login" className="btn-primaire w-full flex items-center justify-center">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
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

            {erreur && <div className="alerte-erreur animate-fade-in">{erreur}</div>}

            <button
              type="submit"
              disabled={chargement}
              className="btn-primaire w-full flex items-center justify-center gap-2"
            >
              {chargement ? "Envoi en cours..." : "Envoyer le lien de réinitialisation →"}
            </button>

            <p className="text-center text-sm text-ardoise">
              <Link to="/login" className="text-indigo font-bold hover:text-or transition-colors underline">
                ← Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
