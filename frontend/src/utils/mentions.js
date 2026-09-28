export const MENTION_ASSURANCE =
  "Montant d'assurance indicatif : la prime d'assurance emprunteur n'est pas fixe. Elle est déterminée par l'assureur partenaire selon votre état de santé (questionnaire médical), votre âge et le montant emprunté.";

export const formaterPourcentage = (fraction) =>
  `${(fraction * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
