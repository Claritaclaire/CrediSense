import Lexique from "./Lexique";

const styles = {
  faible: { bg: "bg-vert/10", border: "border-vert", texte: "text-vert", label: "Risque faible" },
  raisonnable: { bg: "bg-or/10", border: "border-or", texte: "text-or", label: "Risque modéré" },
  eleve: { bg: "bg-argile/10", border: "border-argile", texte: "text-argile", label: "Risque élevé" },
};

function calculerQuotiteCessible(revenu) {
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

export default function BadgeEndettement({ mensualite, revenu = "", chargesMensuelles = 0, mensualitesPrets = 0 }) {
  const revenuNum = Number(revenu);
  const charges = Math.max(0, Number(chargesMensuelles) || 0);
  const prets = Math.max(0, Number(mensualitesPrets) || 0);
  const mensualiteComplete = Math.max(0, Number(mensualite) || 0);
  const engagementTotal = charges + prets + mensualiteComplete;
  const tauxEndettement = revenuNum > 0 ? (engagementTotal / revenuNum) * 100 : null;
  const quotiteCessible = revenuNum > 0 ? calculerQuotiteCessible(revenuNum) : 0;
  const mensualiteDisponible = Math.max(0, quotiteCessible - charges - prets);
  const depasseQuotite = mensualiteComplete > mensualiteDisponible;

  let niveau = null;
  if (tauxEndettement !== null) {
    if (!depasseQuotite && tauxEndettement <= 33) niveau = "faible";
    else if (!depasseQuotite) niveau = "raisonnable";
    else niveau = "eleve";
  }

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
          {depasseQuotite
            ? ` — quotité cessible dépassée (disponible : ${formateurFCFA.format(mensualiteDisponible)} FCFA)`
            : ` — sous la quotité cessible (disponible : ${formateurFCFA.format(mensualiteDisponible)} FCFA)`}
        </p>
      </div>
    </div>
  );
}

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
