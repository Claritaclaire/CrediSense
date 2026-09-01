import { useState } from "react";
import client from "../api/client";

const EXEMPLES = [
  {
    titre: "Pénalités de retard",
    categorie: "Paiement",
    texte: "En cas de retard de paiement, des pénalités de 2% du montant impayé seront appliquées par mois de retard jusqu'au parfait règlement.",
  },
  {
    titre: "Domiciliation de salaire (AVI)",
    categorie: "Garantie",
    texte: "L'emprunteur s'engage à souscrire une Attestation de Virement Irrévocable (AVI) de son salaire sur son compte CCA Bank pendant toute la durée du prêt.",
  },
  {
    titre: "Déchéance du terme",
    categorie: "Contentieux",
    texte: "À défaut de paiement d'une seule échéance à son terme, la totalité du capital restant dû deviendra immédiatement exigible après mise en demeure restée sans effet.",
  },
  {
    titre: "Variation de taux BEAC",
    categorie: "Taux",
    texte: "Le prêteur se réserve le droit de modifier le taux d'intérêt convenu en cas de variation des taux directeurs de la BEAC ou des conditions de marché.",
  },
  {
    titre: "Assurance Décès / Invalidité",
    categorie: "Assurance",
    texte: "L'emprunteur s'engage à maintenir en vigueur le contrat d'assurance décès-invalidité collective souscrit auprès du partenaire agréé par la banque.",
  },
  {
    titre: "Remboursement anticipé",
    categorie: "Remboursement",
    texte: "En cas de remboursement anticipé total ou partiel, une indemnité égale à 1% du montant remboursé par anticipation pourra être perçue par la banque.",
  },
];

function decomposerExplication(texteBrut) {
  if (!texteBrut) return null;

  // Découpage intelligent des 3 parties principales
  const partie1Match = texteBrut.match(/\*\*1\.[^*]+\*\*([\s\S]*?)(?=\*\*2\.|$)/i);
  const partie2Match = texteBrut.match(/\*\*2\.[^*]+\*\*([\s\S]*?)(?=\*\*3\.|$)/i);
  const partie3Match = texteBrut.match(/\*\*3\.[^*]+\*\*([\s\S]*?)$/i);

  const signification = partie1Match ? partie1Match[1].trim() : null;
  const risques = partie2Match ? partie2Match[1].trim() : null;
  const conseil = partie3Match ? partie3Match[1].trim() : null;

  if (signification || risques || conseil) {
    return { signification, risques, conseil };
  }

  // Fallback si la structure en 3 volets diffère légèrement
  return { brut: texteBrut };
}

export default function ExplicationClause() {
  const [texte, setTexte] = useState("");
  const [reponse, setReponse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [copieEffectuee, setCopieEffectuee] = useState(false);

  async function lancerAnalyse(texteAAnalyser) {
    const contenu = texteAAnalyser || texte;
    if (!contenu.trim()) return;

    setErreur("");
    setReponse("");
    setChargement(true);
    setCopieEffectuee(false);

    try {
      const { data } = await client.post("/ia/explication-clause", { texte_clause: contenu.trim() });
      setReponse(data.contenu_reponse);
    } catch {
      setErreur("Impossible d'analyser cette clause pour le moment. Réessayez plus tard.");
    } finally {
      setChargement(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    lancerAnalyse(texte);
  }

  function handleSelectionExemple(exempleTexte) {
    setTexte(exempleTexte);
    lancerAnalyse(exempleTexte);
  }

  function copierExplication() {
    if (!reponse) return;
    navigator.clipboard.writeText(reponse).then(() => {
      setCopieEffectuee(true);
      setTimeout(() => setCopieEffectuee(false), 3000);
    });
  }

  const volets = decomposerExplication(reponse);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Comprendre votre contrat</p>
        <h1 className="section-titre mb-3">Explication de clauses bancaires</h1>
        <p className="text-ardoise max-w-2xl text-sm sm:text-base">
          Collez n'importe quelle clause contractuelle ou cliquez sur un exemple fréquent pour obtenir un décryptage instantané structuré en 3 volets.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Formulaire de saisie */}
        <div className="lg:col-span-3 space-y-4">
          <form onSubmit={handleSubmit} className="carte p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="clause" className="block text-sm text-indigo font-bold">
                Texte de la clause contractuelle
              </label>
              {texte && (
                <button
                  type="button"
                  onClick={() => { setTexte(""); setReponse(""); }}
                  className="text-xs text-ardoise hover:text-rose-600 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
            <textarea
              id="clause"
              required
              rows={7}
              className="champ resize-y text-sm font-mono leading-relaxed"
              placeholder="Collez ici la clause bancaire que vous souhaitez décrypter (ex: pénalités, déchéance, domiciliation)..."
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
            />
            {erreur && <p className="alerte-erreur">{erreur}</p>}
            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={chargement || !texte.trim()}
                className="btn-primaire w-full sm:w-auto"
              >
                {chargement ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-indigo" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Analyse IA en cours...
                  </span>
                ) : (
                  "Expliquer cette clause →"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des exemples interactifs */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="eyebrow">Exemples de clauses fréquentes</p>
            <span className="text-[11px] text-ardoise italic">Clic = Analyse directe</span>
          </div>
          <div className="space-y-2.5">
            {EXEMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectionExemple(ex.texte)}
                className={`carte p-4 text-left text-sm transition-all w-full block group hover:border-or/80 hover:shadow-md ${
                  texte === ex.texte ? "border-or bg-or/5 ring-1 ring-or/40" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="font-bold text-indigo group-hover:text-or transition-colors">{ex.titre}</p>
                  <span className="rounded-full bg-indigo/10 text-indigo px-2 py-0.5 text-[10px] font-semibold">
                    {ex.categorie}
                  </span>
                </div>
                <p className="text-xs text-ardoise line-clamp-2 italic">« {ex.texte} »</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chargement Skeleton */}
      {chargement && (
        <div className="carte p-6 space-y-4 animate-pulse border-l-4 border-l-or">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-5/6"></div>
          </div>
        </div>
      )}

      {/* Résultat visuel en 3 volets */}
      {reponse && !chargement && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo text-white p-4 rounded-xl shadow-sm">
            <div>
              <p className="eyebrow text-or">Résultat du décryptage</p>
              <h2 className="text-lg font-bold">Analyse & Explication de la Clause</h2>
            </div>
            <button
              type="button"
              onClick={copierExplication}
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all flex items-center gap-2"
            >
              {copieEffectuee ? "✓ Explication copiée !" : "📋 Copier l'explication"}
            </button>
          </div>

          {volets && !volets.brut ? (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Carte 1 : Signification */}
              <div className="rounded-xl border border-indigo/20 bg-indigo/5 p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-indigo">
                  <span className="text-xl">💡</span>
                  <h3 className="font-bold text-sm">1. Que signifie cette clause ?</h3>
                </div>
                <p className="text-sm text-indigo/90 leading-relaxed pt-1">
                  {volets.signification}
                </p>
              </div>

              {/* Carte 2 : Risks */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-amber-900">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-bold text-sm">2. Impacts & Risques</h3>
                </div>
                <p className="text-sm text-amber-900/90 leading-relaxed pt-1">
                  {volets.risques}
                </p>
              </div>

              {/* Carte 3 : Conseil CCA Bank */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-900">
                  <span className="text-xl">💼</span>
                  <h3 className="font-bold text-sm">3. Conseil CCA Bank</h3>
                </div>
                <p className="text-sm text-emerald-900/90 leading-relaxed pt-1">
                  {volets.conseil}
                </p>
              </div>
            </div>
          ) : (
            <div className="carte p-6 border-l-4 border-l-or">
              <p className="text-indigo whitespace-pre-wrap leading-relaxed">{reponse}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

