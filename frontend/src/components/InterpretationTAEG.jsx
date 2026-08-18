/**
 * Traduit le TAEG en une phrase compréhensible, contextualisée par rapport
 * à la fourchette de marché et à la durée du prêt.
 */
export default function InterpretationTAEG({ taeg, tauxAnnuel, dureeMois }) {
  const ecartTaeGTaux = taeg - tauxAnnuel * 100;

  let message;
  if (dureeMois <= 12 && ecartTaeGTaux > 3) {
    message = `Le TAEG (${taeg.toFixed(1)}%) est nettement supérieur au taux affiché (${(tauxAnnuel * 100).toFixed(1)}%). Sur une durée courte, les frais de dossier et l'assurance pèsent proportionnellement plus lourd — c'est normal, mais cela mérite d'être comparé à d'autres durées.`;
  } else if (taeg <= 15) {
    message = `Ce TAEG (${taeg.toFixed(1)}%) se situe dans la partie basse du marché camerounais actuel — une offre plutôt avantageuse.`;
  } else if (taeg <= 17) {
    message = `Ce TAEG (${taeg.toFixed(1)}%) est dans la moyenne du marché camerounais actuel.`;
  } else {
    message = `Ce TAEG (${taeg.toFixed(1)}%) est plutôt élevé par rapport au marché. Une durée plus longue ou un montant plus important pourrait réduire ce taux.`;
  }

  return <p className="text-sm text-ardoise leading-relaxed">{message}</p>;
}