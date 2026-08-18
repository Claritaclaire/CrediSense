import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Profil() {
  const { user, setUser } = useAuth();

  // Infos de compte & financières (gauche)
  const [nom, setNom] = useState(user?.nom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profession, setProfession] = useState("");
  const [revenuMensuel, setRevenuMensuel] = useState("");
  const [chargesMensuelles, setChargesMensuelles] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Prêts en cours (droite)
  const [prets, setPrets] = useState([]);
  const [afficherModalPret, setAfficherModalPret] = useState(false);
  const [nouveauPret, setNouveauPret] = useState({
    nomPret: "",
    montantInitial: "",
    mensualite: "",
    dureeMois: "",
  });

  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState("");
  const [erreur, setErreur] = useState("");

  // Charger le profil financier et les prêts sauvegardés
  useEffect(() => {
    if (!user) return;
    const storedProfil = localStorage.getItem(`credisense_profil_${user.id}`);
    if (storedProfil) {
      try {
        const p = JSON.parse(storedProfil);
        setProfession(p.profession || "");
        setRevenuMensuel(p.revenu ? String(p.revenu) : "");
        setChargesMensuelles(p.charges ? String(p.charges) : "");
      } catch (e) {
        console.error(e);
      }
    }

    const fetchPrets = async () => {
      let apiPrets = [];
      try {
        const { data } = await client.get("/historique-prets/");
        apiPrets = data || [];
      } catch (e) {
        console.error("Erreur chargement prêts API:", e);
      }

      let localPrets = [];
      try {
        const storedPrets = localStorage.getItem(`credisense_prets_${user.id}`);
        if (storedPrets) localPrets = JSON.parse(storedPrets);
      } catch (e) {
        console.error("Erreur chargement prêts local:", e);
      }

      setPrets([...apiPrets, ...localPrets]);
    };
    fetchPrets();
  }, [user]);

  const handleSauvegarderProfil = async (e) => {
    e.preventDefault();
    setSucces("");
    setErreur("");

    if (password && password !== confirmPassword) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);
    try {
      // 1. Mise à jour utilisateur backend si nom/email/password modifiés
      const payload = {};
      if (nom && nom !== user.nom) payload.nom = nom;
      if (email && email !== user.email) payload.email = email;
      if (password) payload.password = password;

      if (Object.keys(payload).length > 0) {
        const { data } = await client.patch("/users/me", payload);
        setUser(data);
      }

      // 2. Sauvegarde du profil financier local (revenu, charges, profession)
      const profilData = {
        profession,
        revenu: Number(revenuMensuel) || 0,
        charges: Number(chargesMensuelles) || 0,
      };
      localStorage.setItem(`credisense_profil_${user.id}`, JSON.stringify(profilData));

      setSucces("Vos informations personnelles et financières ont été enregistrées !");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Erreur profil:", err);
      setErreur(err.response?.data?.detail || "Impossible de sauvegarder votre profil.");
    } finally {
      setChargement(false);
    }
  };

  const handleAjouterPret = (e) => {
    e.preventDefault();
    if (!nouveauPret.nomPret || !nouveauPret.mensualite) return;

    const pretObj = {
      id: `custom_${Date.now()}`,
      isLocal: true,
      nomPret: nouveauPret.nomPret,
      montant_initial: Number(nouveauPret.montantInitial) || 0,
      mensualite: Number(nouveauPret.mensualite) || 0,
      duree_mois: Number(nouveauPret.dureeMois) || 12,
      statut: "en_cours",
      date_debut: new Date().toISOString().split("T")[0],
    };

    const nouveauxPrets = [pretObj, ...prets];
    setPrets(nouveauxPrets);

    if (user) {
      try {
        const localPretsActuels = JSON.parse(localStorage.getItem(`credisense_prets_${user.id}`) || "[]");
        const localPretsMAJ = [pretObj, ...localPretsActuels];
        localStorage.setItem(`credisense_prets_${user.id}`, JSON.stringify(localPretsMAJ));
      } catch (e) {
        console.error("Erreur sauvegarde prêt local:", e);
      }
    }

    setNouveauPret({ nomPret: "", montantInitial: "", mensualite: "", dureeMois: "" });
    setAfficherModalPret(false);
    setSucces("Nouveau prêt en cours ajouté avec succès !");
  };

  const handleSupprimerPret = async (pretId, isLocal) => {
    setPrets((prev) => prev.filter((p) => (p.id || p._id) !== pretId));

    if (isLocal && user) {
      try {
        const localPretsActuels = JSON.parse(localStorage.getItem(`credisense_prets_${user.id}`) || "[]");
        const localPretsMAJ = localPretsActuels.filter((p) => p.id !== pretId);
        localStorage.setItem(`credisense_prets_${user.id}`, JSON.stringify(localPretsMAJ));
      } catch (e) {
        console.error("Erreur suppression prêt local:", e);
      }
    } else if (!isLocal) {
      try {
        await client.delete(`/historique-prets/${pretId}`);
      } catch (e) {
        console.error("Erreur suppression prêt API:", e);
      }
    }
  };

  // Calculs financiers synthétiques
  const totalMensualitesPrets = prets
    .filter((p) => p.statut === "en_cours")
    .reduce((sum, p) => sum + (p.mensualite || 0), 0);

  const revenuNum = Number(revenuMensuel) || 0;
  const chargesNum = (Number(chargesMensuelles) || 0) + totalMensualitesPrets;
  const tauxEndettement = revenuNum > 0 ? Math.min(100, Math.round((chargesNum / revenuNum) * 100)) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Titre */}
      <div className="space-y-2">
        <span className="eyebrow">Espace Client</span>
        <h1 className="section-titre">Mon Profil & Informations Financières</h1>
        <p className="text-white/80 text-sm">
          Renseignez vos revenus et gérez vos prêts en cours. Ces informations alimentent automatiquement le calcul de votre taux d'endettement dans toute l'application.
        </p>
      </div>

      {succes && (
        <div className="p-4 bg-emerald-500/20 border-l-4 border-emerald-400 text-emerald-100 rounded-r-lg font-medium text-sm animate-fade-in shadow-md">
          ✓ {succes}
        </div>
      )}

      {erreur && <div className="alerte-erreur animate-fade-in">{erreur}</div>}

      {/* Résumé du Taux d'endettement synthétique */}
      <div className="carte p-5 bg-gradient-to-r from-indigo to-slate-900 text-white rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-or font-bold">Taux d'endettement calculé</span>
          <div className="text-3xl font-extrabold font-display text-white mt-0.5">
            {revenuNum > 0 ? `${tauxEndettement}%` : "Revenu non renseigné"}
          </div>
        </div>
        <div className="text-xs text-white/80 text-right sm:text-left">
          <p>Revenu mensuel : <strong className="text-or">{revenuNum.toLocaleString("fr-FR")} FCFA</strong></p>
          <p>Total charges & mensualités : <strong className="text-amber-300">{chargesNum.toLocaleString("fr-FR")} FCFA</strong></p>
        </div>
      </div>

      {/* Organisation en deux colonnes côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* COLONNE GAUCHE : Informations Personnelles & Financières */}
        <div className="carte p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo text-or font-bold font-display text-xl flex items-center justify-center shadow">
              {user?.nom ? user.nom.slice(0, 2).toUpperCase() : "CS"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-indigo">Informations Personnelles</h2>
              <span className="text-xs text-ardoise">{user?.email}</span>
            </div>
          </div>

          <form onSubmit={handleSauvegarderProfil} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1">
                Nom complet
              </label>
              <input
                type="text"
                required
                className="champ"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1">
                Profession / Statut professionnel
              </label>
              <select
                className="champ"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              >
                <option value="">Sélectionner votre statut</option>
                <option value="Fonctionnaire / Secteur Public">Fonctionnaire / Secteur Public</option>
                <option value="Salarié Secteur Privé">Salarié Secteur Privé</option>
                <option value="Commerçant / Indépendant">Commerçant / Indépendant</option>
                <option value="Professions Libérales">Professions Libérales</option>
                <option value="Retraité">Retraité</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-indigo uppercase tracking-wider mb-1">
                  Revenu mensuel (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex: 450000"
                  className="champ border-or/60 focus:border-or font-bold text-indigo"
                  value={revenuMensuel}
                  onChange={(e) => setRevenuMensuel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ardoise uppercase tracking-wider mb-1">
                  Charges fixes mensuelles (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex: 50000"
                  className="champ"
                  value={chargesMensuelles}
                  onChange={(e) => setChargesMensuelles(e.target.value)}
                />
              </div>
            </div>

            {/* Modification du mot de passe */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-indigo uppercase tracking-wider">
                Changer de mot de passe (optionnel)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  className="champ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Confirmer mot de passe"
                  className="champ"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={chargement} className="btn-primaire w-full">
              {chargement ? "Enregistrement..." : "Enregistrer mon profil →"}
            </button>
          </form>
        </div>

        {/* COLONNE DROITE : Prêts Déjà en Cours */}
        <div className="carte p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-indigo">Prêts Déjà en Cours</h2>
              <p className="text-xs text-ardoise">Vos crédits actuellement en cours de remboursement.</p>
            </div>

            <button
              onClick={() => setAfficherModalPret(true)}
              className="bg-or text-indigo font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-amber-400 shadow transition-all"
            >
              + Ajouter un prêt
            </button>
          </div>

          {/* Formulaire modal ou dépliant d'ajout de prêt */}
          {afficherModalPret && (
            <form onSubmit={handleAjouterPret} className="p-4 bg-slate-50 border border-or/40 rounded-xl space-y-4 animate-slide-up">
              <h3 className="text-xs font-bold text-indigo uppercase">Déclarer un nouveau prêt</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Nom du prêt (ex: Crédit Auto, Prêt conso...)"
                  className="champ text-xs"
                  value={nouveauPret.nomPret}
                  onChange={(e) => setNouveauPret({ ...nouveauPret, nomPret: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    required
                    placeholder="Mensualité FCFA"
                    className="champ text-xs"
                    value={nouveauPret.mensualite}
                    onChange={(e) => setNouveauPret({ ...nouveauPret, mensualite: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Montant initial FCFA"
                    className="champ text-xs"
                    value={nouveauPret.montantInitial}
                    onChange={(e) => setNouveauPret({ ...nouveauPret, montantInitial: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAfficherModalPret(false)}
                  className="btn-ghost text-xs"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primaire py-2 text-xs">
                  Ajouter à mes prêts →
                </button>
              </div>
            </form>
          )}

          {/* Liste des prêts en cours */}
          {prets.length === 0 ? (
            <div className="text-center py-8 text-ardoise space-y-2">
              <span className="text-3xl block">💳</span>
              <p className="text-xs">Aucun prêt en cours déclaré.</p>
              <p className="text-[11px] text-slate-400">
                Si vous avez d'autres crédits en cours dans d'autres banques, ajoutez-les pour obtenir un calcul d'endettement exact.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prets.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-white transition-all shadow-sm"
                >
                  <div>
                    <span className="font-bold text-indigo text-sm block">
                      {p.nomPret || `Prêt #${idx + 1}`}
                    </span>
                    <span className="text-xs text-ardoise">
                      {p.montant_initial ? `${p.montant_initial.toLocaleString("fr-FR")} FCFA initial` : "Crédit en cours"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="font-extrabold text-indigo text-sm block">
                        {p.mensualite?.toLocaleString("fr-FR")} FCFA/mois
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ● {p.statut || "en_cours"}
                      </span>
                    </div>
                    <button
                      type="button"
                      title="Supprimer ce prêt"
                      onClick={() => handleSupprimerPret(p.id, p.isLocal || String(p.id).startsWith("custom_"))}
                      className="text-slate-400 hover:text-red-500 text-xs p-1 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-semibold flex justify-between">
                <span>Mensualités cumulées prêts :</span>
                <span>{totalMensualitesPrets.toLocaleString("fr-FR")} FCFA/mois</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
