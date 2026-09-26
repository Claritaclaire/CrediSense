import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Profil() {
  const { user, setUser } = useAuth();

  // Infos de compte & financières (gauche)
  const [nom, setNom] = useState(user?.nom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telephone, setTelephone] = useState(user?.telephone || "");
  const [profession, setProfession] = useState("");
  const [revenuMensuel, setRevenuMensuel] = useState("");
  const [chargesMensuelles, setChargesMensuelles] = useState("");
  const [photoProfil, setPhotoProfil] = useState("");

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

  // Double authentification (2FA)
  const [setup2FA, setSetup2FA] = useState(null); // { secret, qrCodeBase64 } pendant l'activation
  const [code2FAConfirm, setCode2FAConfirm] = useState("");
  const [afficherDesactivation2FA, setAfficherDesactivation2FA] = useState(false);
  const [motDePasse2FA, setMotDePasse2FA] = useState("");
  const [chargement2FA, setChargement2FA] = useState(false);
  const [erreur2FA, setErreur2FA] = useState("");
  const [succes2FA, setSucces2FA] = useState("");

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
        setPhotoProfil(p.photo || "");
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

  function handlePhotoChange(event) {
    const fichier = event.target.files?.[0];
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) {
      setErreur("Veuillez sélectionner une image.");
      return;
    }
    if (fichier.size > 5 * 1024 * 1024) {
      setErreur("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    const lecteur = new FileReader();
    lecteur.onload = () => {
      const image = new Image();
      image.onload = () => {
        const taille = 512;
        const ratio = Math.min(1, taille / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhotoProfil(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => setErreur("Impossible de traiter cette photo.");
      image.src = lecteur.result;
    };
    lecteur.onerror = () => setErreur("Impossible de lire cette photo.");
    lecteur.readAsDataURL(fichier);
  }

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
      if (telephone !== (user.telephone || "")) payload.telephone = telephone;
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
        photo: photoProfil,
      };
      try {
        localStorage.setItem(`credisense_profil_${user.id}`, JSON.stringify(profilData));
      } catch (storageError) {
        throw new Error("La photo est trop volumineuse pour être enregistrée. Choisissez une image plus légère.");
      }

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

  const demarrerActivation2FA = async () => {
    setErreur2FA("");
    setSucces2FA("");
    setChargement2FA(true);
    try {
      const { data } = await client.post("/auth/2fa/setup");
      setSetup2FA({ secret: data.secret, qrCodeBase64: data.qr_code_base64 });
    } catch (err) {
      setErreur2FA(err.response?.data?.detail || "Impossible de démarrer l'activation de la double authentification.");
    } finally {
      setChargement2FA(false);
    }
  };

  const confirmerActivation2FA = async (e) => {
    e.preventDefault();
    setErreur2FA("");
    setChargement2FA(true);
    try {
      const { data } = await client.post("/auth/2fa/confirm", { code: code2FAConfirm });
      setUser(data);
      setSetup2FA(null);
      setCode2FAConfirm("");
      setSucces2FA("Double authentification activée avec succès !");
    } catch (err) {
      setErreur2FA(err.response?.data?.detail || "Code de vérification incorrect.");
    } finally {
      setChargement2FA(false);
    }
  };

  const desactiver2FA = async (e) => {
    e.preventDefault();
    setErreur2FA("");
    setChargement2FA(true);
    try {
      const { data } = await client.post("/auth/2fa/disable", { password: motDePasse2FA });
      setUser(data);
      setAfficherDesactivation2FA(false);
      setMotDePasse2FA("");
      setSucces2FA("Double authentification désactivée.");
    } catch (err) {
      setErreur2FA(err.response?.data?.detail || "Mot de passe incorrect.");
    } finally {
      setChargement2FA(false);
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
            <div className="relative shrink-0">
              <label htmlFor="photo-profil" className="group block cursor-pointer" title="Modifier la photo de profil">
                {photoProfil ? (
                  <img src={photoProfil} alt="Photo de profil" className="h-16 w-16 rounded-xl object-cover shadow transition group-hover:opacity-80" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo text-xl font-bold font-display text-or shadow transition group-hover:bg-indigo-dark">
                    {user?.nom ? user.nom.slice(0, 2).toUpperCase() : "CS"}
                  </div>
                )}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-indigo/75 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  Modifier
                </span>
              </label>
              <input id="photo-profil" type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
              {photoProfil && (
                <button type="button" onClick={() => setPhotoProfil("")} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow" aria-label="Supprimer la photo de profil" title="Supprimer la photo">
                  ×
                </button>
              )}
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
                Numéro de téléphone
              </label>
              <input
                type="tel"
                placeholder="ex. 679 00 96 30"
                className="champ"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
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

      {/* Sécurité — Double authentification (2FA) */}
      <div className="carte p-6 sm:p-8 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-indigo">Sécurité — Double authentification</h2>
          <p className="text-xs text-ardoise mt-1">
            Ajoutez une couche de protection supplémentaire : un code à 6 chiffres généré par une application d'authentification (Google Authenticator, Authy...) sera demandé en plus de votre mot de passe.
          </p>
        </div>

        {succes2FA && (
          <div className="p-3 bg-emerald-500/10 border-l-4 border-emerald-400 text-emerald-800 rounded-r-lg text-sm font-medium">
            ✓ {succes2FA}
          </div>
        )}
        {erreur2FA && <div className="alerte-erreur">{erreur2FA}</div>}

        {!setup2FA && !afficherDesactivation2FA && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                user?.otp_enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-ardoise"
              }`}
            >
              {user?.otp_enabled ? "● Activée" : "○ Désactivée"}
            </span>
            {user?.otp_enabled ? (
              <button
                type="button"
                onClick={() => setAfficherDesactivation2FA(true)}
                className="btn-secondaire text-xs py-2"
              >
                Désactiver la double authentification
              </button>
            ) : (
              <button
                type="button"
                onClick={demarrerActivation2FA}
                disabled={chargement2FA}
                className="btn-primaire text-xs py-2"
              >
                {chargement2FA ? "Chargement..." : "Activer la double authentification →"}
              </button>
            )}
          </div>
        )}

        {setup2FA && (
          <form onSubmit={confirmerActivation2FA} className="space-y-4 rounded-xl border border-or/40 bg-slate-50 p-4">
            <p className="text-xs font-bold text-indigo">
              1. Scannez ce QR code avec Google Authenticator, Authy ou une app similaire :
            </p>
            <img
              src={`data:image/png;base64,${setup2FA.qrCodeBase64}`}
              alt="QR code de configuration de la double authentification"
              className="h-40 w-40 mx-auto rounded-lg border border-slate-200 bg-white p-2"
            />
            <p className="text-[11px] text-ardoise text-center">
              Impossible de scanner ? Entrez ce code manuellement : <code className="font-bold text-indigo select-all">{setup2FA.secret}</code>
            </p>

            <p className="text-xs font-bold text-indigo pt-2">
              2. Entrez le code à 6 chiffres affiché par l'application :
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              className="champ text-center text-2xl tracking-[0.5em] font-bold chiffres"
              placeholder="000000"
              value={code2FAConfirm}
              onChange={(e) => setCode2FAConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setSetup2FA(null); setCode2FAConfirm(""); setErreur2FA(""); }}
                className="btn-ghost text-xs flex-1"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={chargement2FA || code2FAConfirm.length !== 6}
                className="btn-primaire text-xs flex-1"
              >
                {chargement2FA ? "Vérification..." : "Confirmer et activer"}
              </button>
            </div>
          </form>
        )}

        {afficherDesactivation2FA && (
          <form onSubmit={desactiver2FA} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <label className="block text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Confirmez votre mot de passe pour désactiver la double authentification
            </label>
            <input
              type="password"
              required
              className="champ"
              placeholder="Mot de passe actuel"
              value={motDePasse2FA}
              onChange={(e) => setMotDePasse2FA(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAfficherDesactivation2FA(false); setMotDePasse2FA(""); setErreur2FA(""); }}
                className="btn-ghost text-xs flex-1"
              >
                Annuler
              </button>
              <button type="submit" disabled={chargement2FA} className="btn-primaire text-xs flex-1 bg-rose-600 hover:bg-rose-700">
                {chargement2FA ? "..." : "Désactiver"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
