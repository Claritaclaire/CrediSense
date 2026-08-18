export default function RecommandationIA({ texte, chargement, titre = "Conseil personnalisé" }) {
  if (chargement) {
    return (
      <div className="border-l-2 border-or pl-4 py-1">
        <p className="text-sm text-ardoise italic">Analyse en cours...</p>
      </div>
    );
  }

  if (!texte) return null;

  return (
    <div className="border-l-2 border-or pl-4 py-1">
      <p className="eyebrow mb-2">{titre}</p>
      <p className="text-indigo leading-relaxed">{texte}</p>
      {titre === "Conseil personnalisé" && (
        <p className="text-xs text-ardoise mt-3">
          Cette recommandation est indicative et ne remplace pas l'avis d'un conseiller bancaire.
        </p>
      )}
    </div>
  );
}
