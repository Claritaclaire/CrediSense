import { useState } from "react";
import client from "../api/client";
import RecommandationIA from "../components/RecommandationIA";

const EXEMPLES = [
  "En cas de retard de paiement, des pénalités de 2% du montant impayé seront appliquées par mois de retard.",
  "Le prêteur se réserve le droit de modifier le taux d'intérêt en cas de variation des taux directeurs de la BEAC.",
  "L'emprunteur s'engage à souscrire une assurance décès-invalidité pour la durée totale du crédit.",
];

export default function ExplicationClause() {
  const [texte, setTexte] = useState("");
  const [reponse, setReponse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setErreur("");
    setReponse("");
    setChargement(true);
    try {
      const { data } = await client.post("/ia/explication-clause", { texte_clause: texte.trim() });
      setReponse(data.contenu_reponse);
    } catch {
      setErreur("Impossible d'analyser cette clause pour le moment. Réessayez plus tard.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div>
      <p className="eyebrow mb-2">Comprendre votre contrat</p>
      <h1 className="section-titre mb-3">Explication de clauses</h1>
      <p className="text-ardoise mb-8 max-w-2xl">
        Collez une clause de votre contrat de crédit et obtenez une explication en langage simple,
        sans jargon juridique.
      </p>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="carte p-6 space-y-4">
            <div>
              <label htmlFor="clause" className="block text-sm text-ardoise mb-1">
                Texte de la clause
              </label>
              <textarea
                id="clause"
                required
                rows={6}
                className="champ resize-y"
                placeholder="Collez ici la clause que vous souhaitez comprendre..."
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
              />
            </div>
            {erreur && <p className="alerte-erreur">{erreur}</p>}
            <button type="submit" disabled={chargement} className="btn-primaire">
              {chargement ? "Analyse en cours..." : "Expliquer cette clause"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <p className="eyebrow mb-3">Exemples à tester</p>
          <div className="space-y-2">
            {EXEMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTexte(ex)}
                className="carte p-4 text-left text-sm text-ardoise hover:border-or/40 transition-colors w-full mb-2"
              >
                « {ex.slice(0, 80)}… »
              </button>
            ))}
          </div>
        </div>
      </div>

      {(reponse || chargement) && (
        <div className="carte-accent p-6 mt-8">
          <RecommandationIA
            texte={reponse}
            chargement={chargement}
            titre="Explication simplifiée"
          />
        </div>
      )}
    </div>
  );
}
