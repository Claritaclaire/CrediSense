import JaugeTAEG from "./JaugeTAEG";
import InterpretationTAEG from "./InterpretationTAEG";
import Lexique from "./Lexique";

const formateurFCFA = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function CarteOffre({ offre, recommandee = false, tauxAnnuel, dureeMois, afficherInterpretation = false }) {
  return (
    <div
      className={`carte p-6 transition-all duration-200 ${
        recommandee ? "ring-2 ring-or ring-offset-2" : ""
      }`}
    >
      {recommandee && (
        <p className="text-xs uppercase tracking-widest text-or font-semibold mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-or inline-block" />
          Offre la plus avantageuse
        </p>
      )}
      <h3 className="text-xl font-display mb-4">{offre.nom_banque}</h3>

      <div className="flex justify-center mb-4">
        <JaugeTAEG taeg={offre.taeg} />
      </div>

      {afficherInterpretation && tauxAnnuel !== undefined && (
        <div className="mb-4">
          <InterpretationTAEG taeg={offre.taeg} tauxAnnuel={tauxAnnuel} dureeMois={dureeMois} />
        </div>
      )}

      <dl className="space-y-2.5 text-sm chiffres filet pt-4">
        <div className="flex justify-between items-baseline">
          <dt className="text-ardoise">
            <Lexique terme="mensualite">Mensualité</Lexique>
          </dt>
          <dd className="font-semibold text-base">{formateurFCFA.format(offre.mensualite)} FCFA</dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-ardoise">
            <Lexique terme="cout_total">Coût total</Lexique>
          </dt>
          <dd className="font-medium">{formateurFCFA.format(offre.cout_total)} FCFA</dd>
        </div>
      </dl>
    </div>
  );
}