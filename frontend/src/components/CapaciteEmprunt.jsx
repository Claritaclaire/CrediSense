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
          Évaluez votre capacité selon votre revenu net et la Quotité Cessible Légale (Décret n°94/197/PM du Cameroun).
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
        <div className="space-y-5">
          {/* Bloc de synthèse direct */}
          <div className={`rounded-xl border p-5 text-sm ${resultat.demande_faisable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            <p className="text-base font-bold">
              Résultat pour votre demande de {formateurFCFA.format(resultat.montant_souhaite)} FCFA
            </p>
            {resultat.demande_faisable ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-bold text-emerald-800">
                  ✓ Votre prêt est réalisable à partir de <span className="underline">{resultat.duree_min_faisable} mois</span> de remboursement.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3 pt-3 border-t border-emerald-200/60 text-xs">
                  <div>
                    <span className="block text-emerald-700 font-medium">Mensualité minimale ({resultat.duree_min_faisable} mois) :</span>
                    <span className="text-base font-bold chiffres">{formateurFCFA.format(resultat.mensualite_duree_min)} FCFA/mois</span>
                  </div>
                  <div>
                    <span className="block text-emerald-700 font-medium">Montant total à rembourser :</span>
                    <span className="text-base font-bold text-indigo chiffres">
                      {resultat.cout_total_duree_min ? `${formateurFCFA.format(resultat.cout_total_duree_min)} FCFA` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-emerald-700 font-medium">Capacité mensuelle disponible :</span>
                    <span className="text-base font-bold chiffres">{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</span>
                  </div>
                  <div>
                    <span className="block text-emerald-700 font-medium">Prêts en cours déduits :</span>
                    <span className="text-base font-bold chiffres">{formateurFCFA.format(resultat.total_mensualites_prets_en_cours)} FCFA</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-base font-bold text-rose-800">
                  ❌ Votre demande de {formateurFCFA.format(resultat.montant_souhaite)} FCFA dépasse votre capacité mensuelle autorisée.
                </p>
                <p className="text-xs">
                  La mensualité minimale sur les durées du catalogue excède votre quotité cessible disponible de <strong>{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-indigo p-4 text-white">
              <p className="text-xs text-white/70">Quotité mensuelle disponible (avec prêts)</p>
              <p className="mt-1 text-xl font-bold text-or chiffres">{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Quotité mensuelle nette (sans prêts)</p>
              <p className="mt-1 text-xl font-bold text-indigo chiffres">{formateurFCFA.format(resultat.mensualite_max_sans_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Barème réglementaire utilisé</p>
              <p className="mt-1 text-sm font-bold text-indigo">Décret 94/197/PM (Quotité Cessible)</p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-indigo">Options de remboursement selon la durée</h3>
            <p className="mt-0.5 text-xs text-ardoise">Découvrez ci-dessous votre mensualité, le montant total remboursé et la faisabilité selon chaque durée de prêt.</p>
          </div>

          {resultat.durees.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-ardoise">
                  <tr>
                    <th className="px-4 py-3">Durée</th>
                    <th className="px-4 py-3">Mensualité estimée</th>
                    <th className="px-4 py-3">Montant total remboursé</th>
                    <th className="px-4 py-3">Éligibilité</th>
                    <th className="px-4 py-3">Capacité max d'emprunt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {resultat.durees.map((ligne) => (
                    <Fragment key={ligne.duree_mois}>
                      <tr onClick={() => setLigneOuverte(ligneOuverte === ligne.duree_mois ? null : ligne.duree_mois)} className="cursor-pointer hover:bg-or/5">
                        <td className="px-4 py-3 font-bold text-indigo">{ligne.duree_mois} mois</td>
                        <td className="px-4 py-3 text-ardoise chiffres font-semibold">
                          {ligne.mensualite_demande == null ? "Non proposé" : `${formateurFCFA.format(ligne.mensualite_demande)} FCFA/mois`}
                        </td>
                        <td className="px-4 py-3 text-indigo chiffres font-bold">
                          {ligne.cout_total_demande == null ? "-" : `${formateurFCFA.format(ligne.cout_total_demande)} FCFA`}
                        </td>
                        <td className="px-4 py-3">
                          {ligne.faisable ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              ✓ Réalisable
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              Non réalisable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold chiffres text-indigo">
                          {formateurFCFA.format(ligne.montant_dans_capacite_avec_prets)} FCFA
                        </td>
                      </tr>
                      {ligneOuverte === ligne.duree_mois && (
                        <tr className="bg-slate-50">
                          <td colSpan="5" className="px-4 py-3">
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
