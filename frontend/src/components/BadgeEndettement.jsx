import Lexique from "./Lexique";

const styles = {
  faible: { bg: "bg-vert/10", border: "border-vert", texte: "text-vert", label: "Risque faible" },
  raisonnable: { bg: "bg-or/10", border: "border-or", texte: "text-or", label: "Risque modéré" },
  eleve: { bg: "bg-argile/10", border: "border-argile", texte: "text-argile", label: "Risque élevé" },
};

export default function BadgeEndettement({ mensualite, revenu = "" }) {
  const revenuNum = Number(revenu);
  const tauxEndettement = revenuNum > 0 ? (mensualite / revenuNum) * 100 : null;

  let niveau = null;
  if (tauxEndettement !== null) {
    if (tauxEndettement <= 25) niveau = "faible";
    else if (tauxEndettement <= 33) niveau = "raisonnable";
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
          {formateurFCFA.format(mensualite)} FCFA / {formateurFCFA.format(revenuNum)} FCFA de revenu
          {tauxEndettement > 33 && " — au-delà du seuil recommandé de 33%"}
        </p>
      </div>
    </div>
  );
}

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
