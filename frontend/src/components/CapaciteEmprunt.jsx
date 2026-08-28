import { Fragment, useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function CapaciteEmprunt() {
  const { user } = useAuth();
  const [revenu, setRevenu] = useState("");
  const [montant, setMontant] = useState("");
  const [charges, setCharges] = useState(0);
  const [prets, setPrets] = useState(0);
  const [ligneOuverte, setLigneOuverte] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    try {
      const profil = JSON.parse(localStorage.getItem(`credisense_profil_${user.id}`) || "{}");
      setRevenu(profil.revenu ? String(profil.revenu) : "");
      setCharges(Number(profil.charges) || 0);
    } catch {
      setCharges(0);
    }

    async function chargerPrets() {
      let total = 0;
      try {
        const { data } = await client.get("/historique-prets/");
        total += (data || []).filter((pret) => pret.statut === "en_cours").reduce((sum, pret) => sum + (pret.mensualite || 0), 0);
      } catch {
        // Les prêts locaux restent utilisables si l'API est indisponible.
      }
      try {
        const locaux = JSON.parse(localStorage.getItem(`credisense_prets_${user.id}`) || "[]");
        total += (locaux || []).filter((pret) => pret.statut === "en_cours").reduce((sum, pret) => sum + (pret.mensualite || 0), 0);
      } catch {
        // Aucun prêt local n'est disponible.
      }
      setPrets(total);
    }
    chargerPrets();
  }, [user]);

  async function calculer(event) {
    event.preventDefault();
    setErreur("");
    setResultat(null);
    setChargement(true);

    try {
      const { data } = await client.post("/simulations/capacite", {
        revenu_mensuel: Number(revenu),
        montant_souhaite: Number(montant),
        charges_mensuelles: charges,
        total_mensualites_prets_en_cours: prets,
      });
      setResultat(data);
    } catch (error) {
      setErreur(error.response?.data?.detail || "Impossible de calculer votre capacité pour le moment.");
    } finally {
      setChargement(false);
    }
  }

  const duree12 = resultat?.durees?.find((ligne) => ligne.duree_mois === 12);
  const mensualite12 = duree12?.mensualite_demande;
  const demandeDansCapacite = mensualite12 != null && mensualite12 <= resultat?.mensualite_max_avec_prets;

  return (
    <section className="carte space-y-5 border-l-4 border-l-or p-6">
      <div>
        <p className="eyebrow mb-2">Capacité d'emprunt</p>
        <h2 className="text-xl font-bold text-indigo">Jusqu'à quel montant pouvez-vous emprunter ?</h2>
        <p className="mt-1 max-w-2xl text-sm text-ardoise">
          Évaluez votre capacité selon votre revenu et vos engagements. Le calcul utilise un seuil indicatif de 33 %.
        </p>
      </div>

      <form onSubmit={calculer} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="capacite-revenu" className="mb-1 block text-sm font-medium text-ardoise">Revenu mensuel net (FCFA)</label>
          <input id="capacite-revenu" type="number" min="1" required value={revenu} onChange={(event) => setRevenu(event.target.value)} className="champ chiffres" placeholder="Ex. 350 000" />
        </div>
        <div>
          <label htmlFor="capacite-montant" className="mb-1 block text-sm font-medium text-ardoise">Montant souhaité (FCFA)</label>
          <input id="capacite-montant" type="number" min="1" required value={montant} onChange={(event) => setMontant(event.target.value)} className="champ chiffres" placeholder="Ex. 1 000 000" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ardoise">Charges mensuelles enregistrées</label>
          <p className="champ bg-slate-50 text-ardoise">{formateurFCFA.format(charges)} FCFA</p>
        </div>
        <div>
          <label htmlFor="capacite-prets" className="mb-1 block text-sm font-medium text-ardoise">Mensualités des prêts en cours (FCFA)</label>
          <input id="capacite-prets" type="number" min="0" value={prets} onChange={(event) => setPrets(Number(event.target.value) || 0)} className="champ chiffres" placeholder="Ex. 75 000" />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={chargement} className="btn-primaire w-full sm:w-auto">
            {chargement ? "Calcul en cours..." : "Calculer ma capacité"}
          </button>
        </div>
      </form>

      {erreur && <p className="alerte-erreur">{erreur}</p>}

      {resultat && (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo/15 bg-indigo/5 p-5 text-sm text-ardoise">
            <p className="text-base font-bold text-indigo">Votre situation pour une demande de {formateurFCFA.format(resultat.montant_souhaite)} FCFA</p>
            <ul className="mt-3 space-y-1.5">
              <li>- Mensualité sur 12 mois : <strong className="text-indigo">{mensualite12 == null ? "Non disponible" : `${formateurFCFA.format(mensualite12)} FCFA`}</strong></li>
              <li>- Mensualité disponible avec vos prêts : <strong className="text-indigo">{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA</strong></li>
              <li>- Mensualité disponible sans vos prêts : <strong className="text-indigo">{formateurFCFA.format(resultat.mensualite_max_sans_prets)} FCFA</strong></li>
              <li className={`font-semibold ${demandeDansCapacite ? "text-emerald-700" : "text-rose-700"}`}>
                {demandeDansCapacite
                  ? "✓ Demande inférieure ou égale à votre capacité avec vos prêts en cours."
                  : "❌ Demande supérieure à votre capacité avec vos prêts en cours."}
              </li>
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-indigo p-4 text-white">
              <p className="text-xs text-white/70">Mensualité disponible avec prêts</p>
              <p className="mt-1 text-xl font-bold text-or chiffres">{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Sans prêts en cours</p>
              <p className="mt-1 text-xl font-bold text-indigo chiffres">{formateurFCFA.format(resultat.mensualite_max_sans_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Prêts en cours</p>
              <p className="mt-1 text-xl font-bold text-indigo chiffres">{formateurFCFA.format(resultat.total_mensualites_prets_en_cours)} FCFA</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Seuil indicatif</p>
              <p className="mt-1 text-xl font-bold text-indigo chiffres">{resultat.seuil_endettement}%</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-lg border p-3 text-sm ${resultat.depassement_avec_prets ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
              <strong>Avec prêts en cours :</strong> {resultat.depassement_avec_prets ? "le seuil de 33 % est dépassé." : "la capacité reste sous le seuil de 33 %."}
            </div>
            <div className={`rounded-lg border p-3 text-sm ${resultat.depassement_sans_prets ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
              <strong>Sans prêts en cours :</strong> {resultat.depassement_sans_prets ? "le seuil de 33 % est dépassé." : "la capacité reste sous le seuil de 33 %."}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Projection par durée</p>
            <h3 className="text-lg font-bold text-indigo">Montant maximal estimé selon la durée</h3>
            <p className="mt-1 text-sm text-ardoise">Cliquez sur une durée pour voir comment le capital restant diminue chaque mois jusqu'à zéro.</p>
          </div>

          {resultat.durees.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-ardoise">
                  <tr>
                    <th className="px-4 py-3">Durée</th>
                    <th className="px-4 py-3">Mensualité demandée</th>
                    <th className="px-4 py-3">Montant maximal avec prêts</th>
                    <th className="px-4 py-3">Montant maximal sans prêts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {resultat.durees.map((ligne) => (
                    <Fragment key={ligne.duree_mois}>
                      <tr onClick={() => setLigneOuverte(ligneOuverte === ligne.duree_mois ? null : ligne.duree_mois)} className="cursor-pointer hover:bg-or/5">
                        <td className="px-4 py-3 font-bold text-indigo">{ligne.duree_mois} mois</td>
                        <td className="px-4 py-3 text-ardoise chiffres">{ligne.mensualite_demande == null ? "Non disponible" : `${formateurFCFA.format(ligne.mensualite_demande)} FCFA`}</td>
                        <td className={`px-4 py-3 font-bold chiffres ${Number(ligne.montant_dans_capacite_avec_prets) >= Number(resultat.montant_souhaite) ? "text-emerald-700" : "text-rose-700"}`}>{formateurFCFA.format(ligne.montant_dans_capacite_avec_prets)} FCFA</td>
                        <td className={`px-4 py-3 font-bold chiffres ${Number(ligne.montant_dans_capacite_sans_prets) >= Number(resultat.montant_souhaite) ? "text-emerald-700" : "text-rose-700"}`}>{formateurFCFA.format(ligne.montant_dans_capacite_sans_prets)} FCFA</td>
                      </tr>
                      {ligneOuverte === ligne.duree_mois && (
                        <tr className="bg-slate-50">
                          <td colSpan="4" className="px-4 py-3">
                            <div className="overflow-x-auto">
                              <p className="mb-2 text-xs font-bold text-indigo">Détail du remboursement sur {ligne.duree_mois} mois</p>
                              <table className="min-w-full text-xs"><thead><tr className="text-left text-ardoise"><th className="px-2 py-1">Mois</th><th className="px-2 py-1">Capital début</th><th className="px-2 py-1">Mensualité</th><th className="px-2 py-1">Capital restant</th></tr></thead><tbody className="divide-y divide-slate-200">{ligne.tableau_amortissement.map((mois) => <tr key={mois.mois}><td className="px-2 py-1">{mois.mois}</td><td className="px-2 py-1 chiffres">{formateurFCFA.format(mois.capital_restant_debut)} F</td><td className="px-2 py-1 chiffres">{formateurFCFA.format(mois.mensualite)} F</td><td className="px-2 py-1 font-semibold text-indigo chiffres">{formateurFCFA.format(mois.capital_restant_fin)} F</td></tr>)}</tbody></table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resultat.durees.length === 0 && <p className="p-4 text-sm text-ardoise">Aucune durée de remboursement n'est disponible pour ce montant.</p>}
          <p className="text-xs text-ardoise">Résultat indicatif : la décision finale et le montant accordé dépendent de l'étude du dossier par CCA Bank.</p>
        </div>
      )}
    </section>
  );
}
