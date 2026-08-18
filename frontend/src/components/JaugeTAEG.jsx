/**
 * Jauge TAEG — élément signature de la charte graphique.
 * Positionne le TAEG d'une offre sur un demi-cercle gradué,
 * par rapport à la fourchette de marché observée (13,9% à 16,8%).
 */
export default function JaugeTAEG({ taeg, min = 13, max = 18 }) {
  const pourcentage = Math.min(Math.max((taeg - min) / (max - min), 0), 1);
  const angle = pourcentage * 180; // demi-cercle : 0° à 180°

  const rayon = 70;
  const centreX = 90;
  const centreY = 90;

  // Position de l'aiguille sur l'arc (180° = gauche, 0° = droite)
  const angleRad = ((180 - angle) * Math.PI) / 180;
  const aiguilleX = centreX + rayon * Math.cos(angleRad) * 0.85;
  const aiguilleY = centreY - rayon * Math.sin(angleRad) * 0.85;

  const couleur = taeg <= 15 ? "#3A6B52" : taeg <= 16.5 ? "#B8860B" : "#9B4B3F";

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Arc de fond */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke="#5C6470"
          strokeOpacity="0.2"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Arc coloré jusqu'à la position actuelle */}
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={couleur}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pourcentage * 220} 220`}
        />
        {/* Aiguille */}
        <line
          x1={centreX}
          y1={centreY}
          x2={aiguilleX}
          y2={aiguilleY}
          stroke="#1B2A4A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={centreX} cy={centreY} r="4" fill="#1B2A4A" />
      </svg>
      <p className="chiffres text-3xl font-display -mt-2" style={{ color: couleur }}>
        {taeg.toFixed(2)}%
      </p>
      <p className="text-xs text-ardoise uppercase tracking-wide">TAEG</p>
    </div>
  );
}