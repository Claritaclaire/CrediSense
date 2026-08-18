import { useEffect, useRef, useState } from "react";

const DEFINITIONS = {
  mensualite: "La somme que vous payez chaque mois pour rembourser votre crédit, intérêts inclus.",
  taeg: "Le coût réel de votre crédit sur un an, tout compris : intérêts, frais de dossier et assurance. C'est le chiffre à comparer entre deux offres, plutôt que le taux affiché seul.",
  cout_total: "Ce que vous aurez payé au total à la fin du crédit — la somme de toutes vos mensualités, plus les frais de dossier et l'assurance.",
  endettement: "La part de votre revenu mensuel absorbée par la mensualité. Au-delà de 33%, une banque considère généralement le risque comme élevé.",
};

export default function Lexique({ terme, children }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    function fermer(e) {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="underline decoration-dotted decoration-ardoise/50 underline-offset-2 cursor-help hover:decoration-or transition-colors"
        aria-label={`Définition : ${terme}`}
        aria-expanded={ouvert}
      >
        {children}
      </button>
      {ouvert && (
        <span
          role="tooltip"
          className="absolute z-20 left-0 top-full mt-2 w-64 bg-indigo text-papier text-xs leading-relaxed p-3 rounded-md shadow-lg"
        >
          {DEFINITIONS[terme]}
        </span>
      )}
    </span>
  );
}
