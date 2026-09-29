import Lexique from "./Lexique";

const styles = {
  faible: { bg: "bg-vert/10", border: "border-vert", texte: "text-vert", label: "Risque faible" },
  raisonnable: { bg: "bg-or/10", border: "border-or", texte: "text-or", label: "Risque modéré" },
  eleve: { bg: "bg-argile/10", border: "border-argile", texte: "text-argile", label: "Risque élevé" },
};

export function calculerQuotiteCessible(revenu) {
  const tranches = [
    [18750, 0.1],
    [37500, 0.2],
    [75000, 0.25],
    [112500, 1 / 3],
    [142500, 0.5],
    [Infinity, 1],
  ];
  let precedente = 0;
  let quotite = 0;
  for (const [plafond, taux] of tranches) {
    if (revenu <= precedente) break;
    quotite += (Math.min(revenu, plafond) - precedente) * taux;
    precedente = plafond;
  }
  return quotite;
}

// Règle prudente : un tiers du revenu, sans jamais dépasser la quotité légale.
export function calculerMensualiteMaxPrudente(revenu) {
  return Math.min(calculerQuotiteCessible(revenu), revenu / 3);
}

export default function BadgeEndettement({ mensualite, revenu = "", chargesMensuelles = 0, mensualitesPrets = 0 }) {
  const revenuNum = Number(revenu);
  const charges = Math.max(0, Number(chargesMensuelles) || 0);
  const prets = Math.max(0, Number(mensualitesPrets) || 0);
  const mensualiteComplete = Math.max(0, Number(mensualite) || 0);
  const engagementTotal = charges + prets + mensualiteComplete;
  const tauxEndettement = revenuNum > 0 ? (engagementTotal / revenuNum) * 100 : null;
  const disponiblePrudent = revenuNum > 0 ? Math.max(0, calculerMensualiteMaxPrudente(revenuNum) - charges - prets) : 0;
  const disponibleLegal = revenuNum > 0 ? Math.max(0, calculerQuotiteCessible(revenuNum) - charges - prets) : 0;

  let niveau = null;
  if (tauxEndettement !== null) {
    if (mensualiteComplete <= disponiblePrudent) niveau = "faible";
    else if (mensualiteComplete <= disponibleLegal) niveau = "raisonnable";
    else niveau = "eleve";
  }
  const explication = {
    faible: `sous la capacité prudente (1/3 du revenu, disponible : ${formateurFCFA.format(disponiblePrudent)} FCFA)`,
    raisonnable: `au-delà du tiers du revenu (${formateurFCFA.format(disponiblePrudent)} FCFA) mais sous le maximum légal (${formateurFCFA.format(disponibleLegal)} FCFA)`,
    eleve: `maximum légal dépassé (quotité cessible disponible : ${formateurFCFA.format(disponibleLegal)} FCFA)`,
  };

  if (!revenu) {
    return (
      <div className="carte p-4 text-sm text-ardoise">
        Renseignez votre revenu mensuel dans le bloc « Profil financier » pour voir votre{" "}
        <Lexique terme="endettement">taux d'endettement</Lexique>.
      </div>
    );
  }

  if (revenuNum <= 0) return null;

  const s = styles[niveau];

  return (
    <div
      className={`flex items-center gap-4 border-l-4 ${s.border} ${s.bg} px-5 py-4 rounded-md`}
    >
      <span className={`font-display text-3xl chiffres ${s.texte}`}>
        {tauxEndettement.toFixed(1)}%
      </span>
      <div>
        <p className={`font-medium ${s.texte}`}>
          <Lexique terme="endettement">Taux d'endettement</Lexique> — {s.label}
        </p>
        <p className="text-xs text-ardoise mt-0.5">
          {formateurFCFA.format(engagementTotal)} FCFA d'engagements / {formateurFCFA.format(revenuNum)} FCFA de revenu
          {` — ${explication[niveau]}`}
        </p>
      </div>
    </div>
  );
}

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
