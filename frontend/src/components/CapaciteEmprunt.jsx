import { Fragment, useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAssistant } from "../context/AssistantContext";

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function CapaciteEmprunt() {
  const { user } = useAuth();
  const { ouvrirAvecQuestion } = useAssistant();
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

  // Quand la demande dépasse la capacité, on propose l'alternative la plus favorable
  // déjà calculée par le backend : la durée qui permet d'emprunter le plus (en général
  // la plus longue, puisqu'elle réduit la mensualité par FCFA emprunté).
  const meilleureAlternative = resultat?.durees?.length
    ? resultat.durees.reduce((meilleure, ligne) =>
        !meilleure || ligne.montant_dans_capacite_avec_prets > meilleure.montant_dans_capacite_avec_prets
          ? ligne
          : meilleure,
      null)
    : null;

  // Ce qui reste au client chaque mois une fois toutes ses charges et mensualités payées.
  const resteAVivre = (mensualite) =>
    resultat.revenu_mensuel - resultat.charges_mensuelles - resultat.total_mensualites_prets_en_cours - mensualite;

  const legal = resultat?.legal;

  // Une ligne par durée, avec le verdict des deux règles côte à côte (les durées
  // affinées mois par mois peuvent n'exister que dans l'une des deux analyses).
  const lignesParDuree = resultat
    ? Object.values(
        [...resultat.durees.map((l) => ({ ...l, regle: "prudent" })), ...legal.durees.map((l) => ({ ...l, regle: "legal" }))]
          .reduce((acc, l) => {
            const ligne = acc[l.duree_mois] || {
              duree_mois: l.duree_mois,
              mensualite_demande: l.mensualite_demande,
              cout_total_demande: l.cout_total_demande,
              tableau_amortissement: l.tableau_amortissement,
            };
            ligne[l.regle] = { faisable: l.faisable, capacite: l.montant_dans_capacite_avec_prets };
            acc[l.duree_mois] = ligne;
            return acc;
          }, {})
      ).sort((a, b) => a.duree_mois - b.duree_mois)
    : [];

  const badge = (verdict) =>
    !verdict ? (
      <span className="text-xs text-ardoise">-</span>
    ) : (
      <span className="flex flex-col gap-0.5">
        <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdict.faisable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
          {verdict.faisable ? "✓ Réalisable" : "Non réalisable"}
        </span>
        <span className="text-[11px] text-ardoise chiffres">max {formateurFCFA.format(verdict.capacite)} F</span>
      </span>
    );

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
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Résultat recommandé · règle prudente (au plus 1/3 de votre revenu)
            </p>
            <p className="text-base font-bold">
              Résultat pour votre demande de {formateurFCFA.format(resultat.montant_souhaite)} FCFA
            </p>
            {resultat.demande_faisable ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-bold text-emerald-800">
                  ✓ Votre prêt est réalisable à partir de <span className="underline">{resultat.duree_min_faisable} mois</span> de remboursement.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-3 pt-3 border-t border-emerald-200/60 text-xs">
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
                  <div className="rounded-lg bg-white/70 p-2">
                    <span className="block text-emerald-700 font-medium">Reste à vivre après le prêt :</span>
                    <span className="text-base font-bold text-indigo chiffres">{formateurFCFA.format(resteAVivre(resultat.mensualite_duree_min))} FCFA/mois</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-800">
                  Reste à vivre = revenu net ({formateurFCFA.format(resultat.revenu_mensuel)}) − charges ({formateurFCFA.format(resultat.charges_mensuelles)}) − prêts en cours ({formateurFCFA.format(resultat.total_mensualites_prets_en_cours)}) − nouvelle mensualité ({formateurFCFA.format(resultat.mensualite_duree_min)}).
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-base font-bold text-rose-800">
                  ❌ Votre demande de {formateurFCFA.format(resultat.montant_souhaite)} FCFA dépasse votre capacité mensuelle autorisée.
                </p>
                <p className="text-xs">
                  La mensualité minimale sur les durées du catalogue excède votre capacité de remboursement prudente de <strong>{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</strong>.
                </p>
                {meilleureAlternative && meilleureAlternative.montant_dans_capacite_avec_prets > 0 && (
                  <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-rose-900">
                    💡 Avec votre capacité actuelle, vous pourriez emprunter jusqu'à{" "}
                    <span className="underline">{formateurFCFA.format(meilleureAlternative.montant_dans_capacite_avec_prets)} FCFA</span>{" "}
                    sur {meilleureAlternative.duree_mois} mois.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() =>
                    ouvrirAvecQuestion(
                      `Ma demande de ${formateurFCFA.format(resultat.montant_souhaite)} FCFA dépasse ma capacité ` +
                        `(revenu ${formateurFCFA.format(resultat.revenu_mensuel)}, charges ${formateurFCFA.format(resultat.charges_mensuelles)}, ` +
                        `prêts ${formateurFCFA.format(resultat.total_mensualites_prets_en_cours)}/mois, ` +
                        `capacité dispo ${formateurFCFA.format(resultat.mensualite_max_avec_prets)}/mois, en FCFA). Pourquoi, et que faire ?`
                    )
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-or px-4 py-2.5 text-sm font-bold text-indigo shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-or focus:ring-offset-2"
                >
                  💬 Poser la question à l'assistant →
                </button>
              </div>
            )}
          </div>

          {/* Plafond légal : ce que la loi autorise au maximum, présenté comme une limite */}
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
              Pour information · maximum autorisé par la loi (Décret 94/197/PM)
            </p>
            {legal.demande_faisable ? (
              <p className="mt-2">
                Au maximum légal, votre demande serait réalisable dès <strong>{legal.duree_min_faisable} mois</strong>, avec une mensualité de{" "}
                <strong className="chiffres">{formateurFCFA.format(legal.mensualite_duree_min)} FCFA</strong>. Il ne vous resterait alors que{" "}
                <strong className="chiffres">{formateurFCFA.format(resteAVivre(legal.mensualite_duree_min))} FCFA/mois</strong> pour vivre.
              </p>
            ) : (
              <p className="mt-2">Même au maximum autorisé par la loi, cette demande dépasse votre capacité de remboursement.</p>
            )}
            <p className="mt-2 text-xs text-amber-900/80">
              Ce plafond est la part maximale du salaire que la loi permet de céder. C'est une limite à ne pas dépasser, pas un niveau d'endettement conseillé.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-indigo p-4 text-white">
              <p className="text-xs text-white/70">Capacité prudente (1/3 du revenu, après charges et prêts)</p>
              <p className="mt-1 text-xl font-bold text-or chiffres">{formateurFCFA.format(resultat.mensualite_max_avec_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Maximum légal (quotité cessible, après charges et prêts)</p>
              <p className="mt-1 text-xl font-bold text-indigo chiffres">{formateurFCFA.format(legal.mensualite_max_avec_prets)} FCFA/mois</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-ardoise">Règle la plus stricte pour votre revenu</p>
              <p className="mt-1 text-sm font-bold text-indigo">
                {resultat.tiers_plus_strict ? "Le tiers du revenu (règle prudente)" : "La quotité cessible légale"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-indigo">Options de remboursement selon la durée</h3>
            <p className="mt-0.5 text-xs text-ardoise">Découvrez ci-dessous votre mensualité, le montant total remboursé et la faisabilité selon chaque durée, avec la règle prudente et avec le maximum légal (« max » = montant maximal empruntable).</p>
          </div>

          {lignesParDuree.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-ardoise">
                  <tr>
                    <th className="px-4 py-3">Durée</th>
                    <th className="px-4 py-3">Mensualité estimée</th>
                    <th className="px-4 py-3">Montant total remboursé</th>
                    <th className="px-4 py-3">Reste à vivre</th>
                    <th className="px-4 py-3">Règle prudente (1/3)</th>
                    <th className="px-4 py-3">Maximum légal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lignesParDuree.map((ligne) => (
                    <Fragment key={ligne.duree_mois}>
                      <tr onClick={() => setLigneOuverte(ligneOuverte === ligne.duree_mois ? null : ligne.duree_mois)} className="cursor-pointer hover:bg-or/5">
                        <td className="px-4 py-3 font-bold text-indigo">{ligne.duree_mois} mois</td>
                        <td className="px-4 py-3 text-ardoise chiffres font-semibold">
                          {ligne.mensualite_demande == null ? "Non proposé" : `${formateurFCFA.format(ligne.mensualite_demande)} FCFA/mois`}
                        </td>
                        <td className="px-4 py-3 text-indigo chiffres font-bold">
                          {ligne.cout_total_demande == null ? "-" : `${formateurFCFA.format(ligne.cout_total_demande)} FCFA`}
                        </td>
                        <td className="px-4 py-3 text-ardoise chiffres">
                          {ligne.mensualite_demande == null ? "-" : `${formateurFCFA.format(resteAVivre(ligne.mensualite_demande))} FCFA/mois`}
                        </td>
                        <td className="px-4 py-3">{badge(ligne.prudent)}</td>
                        <td className="px-4 py-3">{badge(ligne.legal)}</td>
                      </tr>
                      {ligneOuverte === ligne.duree_mois && (
                        <tr className="bg-slate-50">
                          <td colSpan="6" className="px-4 py-3">
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
          {lignesParDuree.length === 0 &&<p className="p-4 text-sm text-ardoise">Aucune durée de remboursement n'est disponible pour ce montant.</p>}
          <p className="text-xs text-ardoise">Résultat indicatif : la décision finale et le montant accordé dépendent de l'étude du dossier par CCA Bank.</p>
        </div>
      )}
    </section>
  );
}
