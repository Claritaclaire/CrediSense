import { useEffect, useMemo, useState } from "react";

function bornesOffres(offres, offreId, offreIds, multiSelect) {
  if (multiSelect) {
    const selection = offres.filter((o) => offreIds.includes(String(o.id)));
    if (!selection.length) {
      return { montantMin: 100000, montantMax: 25000000, dureeMin: 1, dureeMax: 120 };
    }
    return {
      montantMin: 100000,
      montantMax: Math.min(...selection.map((o) => o.montant_max)),
      dureeMin: Math.max(...selection.map((o) => o.duree_min_mois)),
      dureeMax: Math.min(...selection.map((o) => o.duree_max_mois)),
    };
  }

  const offre = offres.find((o) => String(o.id) === String(offreId));
  if (!offre) {
    return { montantMin: 100000, montantMax: 25000000, dureeMin: 1, dureeMax: 120 };
  }
  return {
    montantMin: 100000,
    montantMax: offre.montant_max,
    dureeMin: offre.duree_min_mois,
    dureeMax: offre.duree_max_mois,
  };
}

export default function FormulaireSimulation({
  offres,
  onSubmit,
  chargement,
  multiSelect = false,
  initialOffreId = "",
  initialMontant = "",
  initialDuree = "",
}) {
  const [offreId, setOffreId] = useState(initialOffreId);
  const [offreIds, setOffreIds] = useState([]);
  const [montant, setMontant] = useState(initialMontant);
  const [dureeMois, setDureeMois] = useState(initialDuree);

  // Mettre à jour l'offre sélectionnée si transmis en prop
  useEffect(() => {
    if (initialOffreId) setOffreId(initialOffreId);
    if (initialMontant) setMontant(initialMontant);
    if (initialDuree) setDureeMois(initialDuree);
  }, [initialOffreId, initialMontant, initialDuree]);

  // Sélectionner par défaut la 1ère offre si non renseignée
  useEffect(() => {
    if (!multiSelect && !offreId && offres.length > 0) {
      setOffreId(String(offres[0].id));
    }
  }, [offres, offreId, multiSelect]);

  const bornes = useMemo(
    () => bornesOffres(offres, offreId, offreIds, multiSelect),
    [offres, offreId, offreIds, multiSelect]
  );

  useEffect(() => {
    if (multiSelect && offreIds.length === 0 && offres.length > 0) {
      setOffreIds(offres.slice(0, Math.min(2, offres.length)).map((o) => String(o.id)));
    }
  }, [multiSelect, offres, offreIds.length]);

  function toggleOffre(id) {
    setOffreIds((prev) =>
      prev.includes(String(id)) ? prev.filter((o) => o !== String(id)) : [...prev, String(id)]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (multiSelect) {
      onSubmit({ offre_ids: offreIds, montant: Number(montant), duree_mois: Number(dureeMois) });
    } else {
      onSubmit({ offre_id: offreId, montant: Number(montant), duree_mois: Number(dureeMois) });
    }
  }

  const offreSelectionnee = offres.find((o) => String(o.id) === String(offreId));

  const formatTaux = (taux) => {
    if (!taux) return "0";
    return taux > 1 ? taux.toFixed(1) : (taux * 100).toFixed(1);
  };

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:items-start">
      {multiSelect ? (
        <fieldset className="carte min-w-0 p-5">
          <legend className="block max-w-full break-words text-sm font-semibold uppercase tracking-wider text-indigo">
            Produits à comparer
          </legend>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {offres.map((offre) => (
              <label
                key={offre.id}
                className={`relative flex min-h-32 items-start gap-3 rounded-xl border-2 p-4 text-sm cursor-pointer transition-all duration-200 ${
                  offreIds.includes(String(offre.id))
                    ? "border-or bg-or/10 shadow-md"
                    : "border-slate-200 bg-white hover:border-or/50 hover:shadow-sm"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-indigo"
                  checked={offreIds.includes(String(offre.id))}
                  onChange={() => toggleOffre(offre.id)}
                />
                <span className="min-w-0">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ardoise">{offre.categorie_client === "professionnel" ? "Entreprise" : "Particulier"}</span>
                  <span className="block pr-6 font-bold text-indigo">{offre.nom_banque}</span>
                  <span className="mt-1 block text-or font-bold chiffres text-lg">
                    {formatTaux(offre.taux_annuel)} %
                  </span>
                  <span className="mt-1 block text-ardoise chiffres text-xs leading-relaxed">
                    {offre.duree_min_mois}–{offre.duree_max_mois} mois · jusqu’à {" "}
                    {offre.montant_max.toLocaleString("fr-FR")} FCFA
                  </span>
                </span>
                {offreIds.includes(String(offre.id)) && (
                  <span className="absolute right-3 top-3 rounded-full bg-indigo px-2 py-0.5 text-[10px] font-bold text-white">
                    Sélectionnée
                  </span>
                )}
              </label>
            ))}
          </div>
          {offreIds.length > 0 && (
            <p className="text-xs text-ardoise mt-2">
              Durée commune : {bornes.dureeMin}–{bornes.dureeMax} mois · Plafond :{" "}
              {bornes.montantMax.toLocaleString("fr-FR")} FCFA
            </p>
          )}
        </fieldset>
      ) : (
        <fieldset className="carte p-5">
          <legend className="block text-xs font-semibold text-indigo uppercase tracking-wider mb-3">
            Produit de crédit CCA Bank
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {offres.map((offre) => (
              <label
                key={offre.id}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                  String(offre.id) === String(offreId)
                    ? "border-or bg-or/10 shadow-md"
                    : "border-slate-200 bg-white hover:border-or/50 hover:shadow-sm"
                }`}
              >
                <input
                  type="radio"
                  name="offre_id"
                  value={offre.id}
                  required
                  checked={String(offre.id) === String(offreId)}
                  onChange={(e) => setOffreId(e.target.value)}
                  className="sr-only"
                />
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ardoise">{offre.categorie_client === "professionnel" ? "Entreprise" : "Particulier"}</span>
                <span className="block pr-20 font-bold text-indigo">{offre.nom_banque}</span>
                <span className="mt-2 block text-2xl font-bold text-or chiffres">
                  {formatTaux(offre.taux_annuel)} %
                </span>
                <span className="mt-1 block text-xs text-ardoise">Taux nominal annuel</span>
                <span className="mt-3 block border-t border-slate-100 pt-2 text-xs text-ardoise chiffres">
                  {offre.duree_min_mois}–{offre.duree_max_mois} mois · Plafond {" "}
                  {offre.montant_max.toLocaleString("fr-FR")} FCFA
                </span>
                {String(offre.id) === String(offreId) && (
                  <span className="absolute right-3 top-3 rounded-full bg-indigo px-2 py-0.5 text-[10px] font-bold text-white">
                    Sélectionnée
                  </span>
                )}
              </label>
            ))}
          </div>
          {offreSelectionnee && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ardoise font-medium">
              Offre sélectionnée : {offreSelectionnee.nom_banque} · durée autorisée {" "}
              {offreSelectionnee.duree_min_mois}–{offreSelectionnee.duree_max_mois} mois
            </p>
          )}
        </fieldset>
      )}

      <form onSubmit={handleSubmit} className="carte p-6 space-y-6 shadow-lg border-t-4 border-t-or">
        <div>
          <p className="eyebrow mb-2">Vos paramètres</p>
          <h2 className="text-xl font-bold text-indigo">Définissez votre projet</h2>
          <p className="mt-1 text-sm text-ardoise">
            Renseignez le montant et la durée souhaités pour obtenir une estimation.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="montant" className="block text-xs font-semibold text-indigo uppercase tracking-wider mb-1">Montant du prêt (FCFA)</label>
            <input id="montant" type="number" required min={bornes.montantMin} max={bornes.montantMax} step="10000" className="champ chiffres font-bold text-indigo" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Ex. 1 500 000" />
            <p className="mt-1 text-xs text-ardoise chiffres">Maximum : {bornes.montantMax.toLocaleString("fr-FR")} FCFA</p>
          </div>
          <div>
            <label htmlFor="duree" className="block text-xs font-semibold text-indigo uppercase tracking-wider mb-1">Durée (mois)</label>
            <input id="duree" type="number" required min={bornes.dureeMin} max={bornes.dureeMax} className="champ chiffres font-bold text-indigo" value={dureeMois} onChange={(e) => setDureeMois(e.target.value)} placeholder="Ex. 24" />
            <p className="mt-1 text-xs text-ardoise">Entre {bornes.dureeMin} et {bornes.dureeMax} mois</p>
          </div>
        </div>

      <button
        type="submit"
        disabled={chargement || (multiSelect && offreIds.length < 2)}
        className="btn-primaire w-full flex items-center justify-center gap-2 group"
      >
        {chargement ? "Calcul en cours..." : multiSelect ? "Comparer les offres →" : "Calculer ma mensualité →"}
      </button>
      </form>
    </div>
  );
}
