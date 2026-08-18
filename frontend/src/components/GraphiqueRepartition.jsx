const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Donut SVG montrant la répartition capital remboursé vs intérêts totaux.
 */
export default function GraphiqueRepartition({ lignes, fraisDossier = 0, assuranceMensuelle = 0 }) {
  if (!lignes?.length) return null;

  const totalInterets = lignes.reduce((s, l) => s + l.interets, 0);
  const totalCapital = lignes.reduce((s, l) => s + l.part_capital, 0);
  const totalAssurance = assuranceMensuelle * lignes.length;
  const segments = [
    { label: "Capital", valeur: totalCapital, couleur: "#1B2A4A" },
    { label: "Intérêts", valeur: totalInterets, couleur: "#B8860B" },
  ];
  if (fraisDossier > 0) {
    segments.push({ label: "Frais dossier", valeur: fraisDossier, couleur: "#9B4B3F" });
  }
  if (totalAssurance > 0) {
    segments.push({ label: "Assurance", valeur: totalAssurance, couleur: "#3A6B52" });
  }

  const total = segments.reduce((s, seg) => s + seg.valeur, 0);
  if (total === 0) return null;

  const rayon = 54;
  const centre = 70;
  let angleDepart = -90;

  const arcs = segments.map((seg) => {
    const fraction = seg.valeur / total;
    const angle = fraction * 360;
    const angleFin = angleDepart + angle;
    const x1 = centre + rayon * Math.cos((angleDepart * Math.PI) / 180);
    const y1 = centre + rayon * Math.sin((angleDepart * Math.PI) / 180);
    const x2 = centre + rayon * Math.cos((angleFin * Math.PI) / 180);
    const y2 = centre + rayon * Math.sin((angleFin * Math.PI) / 180);
    const grandArc = angle > 180 ? 1 : 0;
    const d = `M ${centre} ${centre} L ${x1} ${y1} A ${rayon} ${rayon} 0 ${grandArc} 1 ${x2} ${y2} Z`;
    angleDepart = angleFin;
    return { ...seg, d, fraction };
  });

  return (
    <div className="carte p-5">
      <p className="eyebrow mb-4">Répartition du coût total</p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.couleur} opacity="0.9" />
          ))}
          <circle cx={centre} cy={centre} r="32" fill="white" />
          <text x={centre} y={centre - 4} textAnchor="middle" className="fill-indigo text-[10px] font-medium">
            Total
          </text>
          <text x={centre} y={centre + 10} textAnchor="middle" className="fill-indigo text-[9px] chiffres">
            {formateurFCFA.format(total)} F
          </text>
        </svg>
        <ul className="space-y-2.5 text-sm flex-1 w-full">
          {arcs.map((arc) => (
            <li key={arc.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ardoise">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: arc.couleur }} />
                {arc.label}
              </span>
              <span className="chiffres font-medium">
                {formateurFCFA.format(arc.valeur)} F
                <span className="text-ardoise font-normal ml-1">({(arc.fraction * 100).toFixed(0)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
