import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

const PERMISSIONS = [
  ["demandes", "Demandes de crédit"],
  ["offres", "Offres de crédit"],
  ["clients", "Comptes clients"],
  ["ia", "Supervision IA"],
];

const FORM_INITIAL = {
  nom: "",
  email: "",
  password: "",
  telephone: "",
  banque: "",
  agence: "",
  role: "admin",
  permissions: [],
};

const formatDate = (value) => value ? new Date(value).toLocaleString("fr-FR") : "-";

export default function AdministrationSysteme() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [administrateurs, setAdministrateurs] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [formulaire, setFormulaire] = useState(FORM_INITIAL);
  const [editionId, setEditionId] = useState(null);
  const [onglet, setOnglet] = useState("vue");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  async function charger() {
    setChargement(true);
    setErreur("");
    try {
      const [dashboardResponse, adminsResponse] = await Promise.all([
        client.get("/admin-systeme/dashboard"),
        client.get("/admin-systeme/administrateurs", { params: recherche ? { recherche } : {} }),
      ]);
      setDashboard(dashboardResponse.data);
      setAdministrateurs(adminsResponse.data);
    } catch (error) {
      setErreur(error.response?.data?.detail || "Impossible de charger l’administration système.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { if (user?.role === "admin_systeme") charger(); }, [user, recherche]);

  if (user && user.role !== "admin_systeme") return <Navigate to="/" replace />;

  function changerChamp(event) {
    const { name, value } = event.target;
    setFormulaire((precedent) => ({ ...precedent, [name]: value }));
  }

  function changerPermission(permission) {
    setFormulaire((precedent) => ({
      ...precedent,
      permissions: precedent.permissions.includes(permission)
        ? precedent.permissions.filter((item) => item !== permission)
        : [...precedent.permissions, permission],
    }));
  }

  function commencerEdition(administrateur) {
    setEditionId(administrateur.id);
    setFormulaire({
      ...administrateur,
      password: "",
      permissions: administrateur.permissions || [],
    });
    setOnglet("admins");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function annulerEdition() {
    setEditionId(null);
    setFormulaire(FORM_INITIAL);
  }

  async function enregistrer(event) {
    event.preventDefault();
    setEnvoi(true);
    setMessage("");
    setErreur("");
    try {
      if (editionId) {
        const { password, ...modification } = formulaire;
        await client.patch(`/admin-systeme/administrateurs/${editionId}`, modification);
        setMessage("Administrateur bancaire mis à jour.");
      } else {
        await client.post("/admin-systeme/administrateurs", formulaire);
        setMessage("Administrateur bancaire créé.");
      }
      annulerEdition();
      await charger();
    } catch (error) {
      setErreur(error.response?.data?.detail || "Impossible d’enregistrer ce compte.");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerActif(administrateur) {
    try {
      await client.patch(`/admin-systeme/administrateurs/${administrateur.id}`, { actif: !administrateur.actif });
      setMessage(administrateur.actif ? "Compte désactivé." : "Compte activé.");
      await charger();
    } catch (error) {
      setErreur(error.response?.data?.detail || "Impossible de modifier l’état du compte.");
    }
  }

  const activites = dashboard?.dernieres_activites || [];
  const cartes = [
    ["Clients", dashboard?.total_clients, "text-indigo"],
    ["Administrateurs bancaires", dashboard?.administrateurs_bancaires, "text-emerald-700"],
    ["Comptes actifs", dashboard?.comptes_actifs, "text-sky-700"],
    ["Comptes désactivés", dashboard?.comptes_desactives, "text-rose-700"],
  ];

  return (
    <div className="min-h-screen px-4 py-6 text-slate-800 sm:px-8 lg:px-12">
      <header className="carte mx-auto flex max-w-7xl flex-col justify-between gap-5 border-t-4 border-t-or p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <img src="/logo-credisense.png" alt="CrediSense" className="h-10 w-auto logo-frame logo-glow" />
            <span className="eyebrow">Administration système</span>
          </div>
          <h1 className="mt-2 text-3xl font-display font-bold text-indigo">Administration système</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Supervisez la plateforme et les administrateurs bancaires sans gérer les offres ni les comptes clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-indigo/15 bg-indigo/5 px-4 py-3 text-sm">
            <p className="font-semibold text-indigo">{user?.nom}</p>
            <p className="text-xs text-ardoise">Admin système · Accès global</p>
          </div>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="btn-secondaire whitespace-nowrap px-4 py-3 text-sm">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200" aria-label="Sections administration système">
          {[["vue", "Vue d’ensemble"], ["admins", "Administrateurs bancaires"], ["securite", "Activités et sécurité"]].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setOnglet(value)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${onglet === value ? "border-amber-500 text-indigo" : "border-transparent text-slate-500 hover:text-indigo"}`}>
              {label}
            </button>
          ))}
        </nav>

        {erreur && <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{erreur}</div>}
        {message && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

        {onglet === "vue" && (
          <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cartes.map(([label, value, couleur]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-3 text-3xl font-bold ${couleur}`}>{chargement ? "…" : value ?? 0}</p></div>)}
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-indigo">Dernières activités</h2>
              <ActivitesTable activites={activites.slice(0, 8)} />
            </div>
          </section>
        )}

        {onglet === "admins" && (
          <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <form onSubmit={enregistrer} className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-indigo">{editionId ? "Modifier un compte" : "Créer un administrateur bancaire"}</h2><p className="mt-1 text-xs text-slate-500">Les champs marqués d’un astérisque sont obligatoires.</p></div>{editionId && <button type="button" onClick={annulerEdition} className="text-xs font-semibold text-slate-500">Annuler</button>}</div>
              <div className="space-y-3">
                {["nom", "email", "telephone", "banque", "agence"].map((champ) => <label key={champ} className="block text-sm font-medium text-slate-700">{champ === "nom" ? "Nom *" : champ === "email" ? "Adresse e-mail *" : champ[0].toUpperCase() + champ.slice(1)}<input required={!editionId && ["nom", "email"].includes(champ)} type={champ === "email" ? "email" : "text"} name={champ} value={formulaire[champ] || ""} onChange={changerChamp} className="champ mt-1" /></label>)}
                {!editionId && <label className="block text-sm font-medium text-slate-700">Mot de passe temporaire *<input required name="password" type="password" minLength="8" value={formulaire.password} onChange={changerChamp} className="champ mt-1" /></label>}
                <label className="block text-sm font-medium text-slate-700">Rôle<select name="role" value={formulaire.role} onChange={changerChamp} className="champ mt-1"><option value="admin">Administrateur bancaire</option><option value="conseiller">Conseiller bancaire</option></select></label>
                <fieldset><legend className="text-sm font-medium text-slate-700">Droits d’accès</legend><div className="mt-2 grid gap-2">{PERMISSIONS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={formulaire.permissions.includes(value)} onChange={() => changerPermission(value)} />{label}</label>)}</div></fieldset>
                <button type="submit" disabled={envoi} className="w-full rounded-lg bg-indigo px-4 py-3 text-sm font-bold text-white hover:bg-indigo-dark disabled:opacity-50">{envoi ? "Enregistrement…" : editionId ? "Enregistrer les modifications" : "Créer le compte"}</button>
              </div>
            </form>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-indigo">Comptes administrateurs</h2><p className="text-sm text-slate-500">{administrateurs.length} compte(s) bancaire(s)</p></div><input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un compte…" className="champ max-w-xs" /></div><AdministrateursTable administrateurs={administrateurs} onEdit={commencerEdition} onToggle={basculerActif} /></div>
          </section>
        )}

        {onglet === "securite" && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-indigo">Activités et sécurité</h2><p className="mt-1 text-sm text-slate-500">Traçabilité des actions réalisées dans l’administration.</p><ActivitesTable activites={activites} /></section>}
      </main>
    </div>
  );
}

function AdministrateursTable({ administrateurs, onEdit, onToggle }) {
  return <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Administrateur</th><th className="px-3 py-3">Banque / agence</th><th className="px-3 py-3">Rôle</th><th className="px-3 py-3">État</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{administrateurs.map((admin) => <tr key={admin.id}><td className="px-3 py-3"><p className="font-semibold text-indigo">{admin.nom}</p><p className="text-xs text-slate-500">{admin.email} · {admin.telephone || "Téléphone non renseigné"}</p></td><td className="px-3 py-3 text-slate-600">{admin.banque || "-"}<br /><span className="text-xs">{admin.agence || "-"}</span></td><td className="px-3 py-3 text-slate-600">{admin.role === "admin" ? "Admin bancaire" : "Conseiller"}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${admin.actif ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{admin.actif ? "Actif" : "Désactivé"}</span></td><td className="space-x-2 whitespace-nowrap px-3 py-3"><button type="button" onClick={() => onEdit(admin)} className="text-xs font-bold text-indigo hover:text-amber-700">Modifier</button><button type="button" onClick={() => onToggle(admin)} className="text-xs font-bold text-slate-500 hover:text-rose-700">{admin.actif ? "Désactiver" : "Activer"}</button></td></tr>)}</tbody></table>{administrateurs.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Aucun administrateur trouvé.</p>}</div>;
}

function ActivitesTable({ activites }) {
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Utilisateur</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Cible</th><th className="px-3 py-3">Détails</th></tr></thead><tbody className="divide-y divide-slate-100">{activites.map((activite) => <tr key={activite.id}><td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(activite.timestamp)}</td><td className="px-3 py-3"><p className="font-semibold text-indigo">{activite.utilisateur_nom || "Compte inconnu"}</p><p className="text-xs text-slate-500">{activite.utilisateur_email || activite.admin_id?.slice(0, 8)}</p></td><td className="px-3 py-3 font-semibold text-indigo">{activite.action}</td><td className="px-3 py-3 text-slate-600">{activite.target_table || "-"}</td><td className="max-w-xs px-3 py-3 text-xs text-slate-500">{activite.details || "-"}</td></tr>)}</tbody></table>{activites.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Aucune activité récente.</p>}</div>;
}
