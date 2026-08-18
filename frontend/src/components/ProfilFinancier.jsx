import Lexique from "./Lexique";

/**
 * Bloc unique pour revenu et apport — partagé entre endettement et recommandation IA.
 */
export default function ProfilFinancier({
  revenu,
  apport,
  projet = "",
  onRevenuChange,
  onApportChange,
  onProjetChange,
  compact = false,
}) {
  return (
    <div className={`carte p-5 ${compact ? "" : "mb-6"}`}>
      <p className="eyebrow mb-3">Votre profil & projet</p>
      <p className="text-sm text-ardoise mb-4">
        Ces informations servent à calculer votre{" "}
        <Lexique terme="endettement">taux d'endettement</Lexique> et à personnaliser le conseil IA selon votre projet.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="projet" className="block text-sm text-ardoise mb-1">
            Projet / Objet du crédit
          </label>
          <select
            id="projet"
            className="champ"
            value={projet}
            onChange={(e) => onProjetChange && onProjetChange(e.target.value)}
          >
            <option value="">Sélectionner un projet</option>
            <option value="Achat immobilier / Logement">Achat immobilier / Logement</option>
            <option value="Achat véhicule / Automobile">Achat véhicule / Automobile</option>
            <option value="Travaux & Rénovation">Travaux & Rénovation</option>
            <option value="Équipement & Électroménager">Équipement & Électroménager</option>
            <option value="Besoin de trésorerie / Consommation">Besoin de trésorerie / Consommation</option>
            <option value="Projet personnel / Autre">Projet personnel / Autre</option>
          </select>
        </div>
        <div>
          <label htmlFor="revenu" className="block text-sm text-ardoise mb-1">
            Revenu mensuel net (FCFA)
          </label>
          <input
            id="revenu"
            type="number"
            min="0"
            step="10000"
            className="champ chiffres"
            placeholder="Ex. 350 000"
            value={revenu}
            onChange={(e) => onRevenuChange(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="apport" className="block text-sm text-ardoise mb-1">
            Apport disponible (FCFA)
          </label>
          <input
            id="apport"
            type="number"
            min="0"
            step="10000"
            className="champ chiffres"
            placeholder="Ex. 500 000"
            value={apport}
            onChange={(e) => onApportChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
