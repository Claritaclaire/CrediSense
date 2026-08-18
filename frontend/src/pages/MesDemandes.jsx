import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function MesDemandes() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Pre-fill from navigation state if coming from a simulation
  const initialSimulation = location.state?.simulation || null;

  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Form state
  const [afficherFormulaire, setAfficherFormulaire] = useState(Boolean(initialSimulation));
  const [montant, setMontant] = useState(initialSimulation?.montant || "");
  const [duree, setDuree] = useState(initialSimulation?.duree_mois || "");
  const [apport, setApport] = useState(initialSimulation?.apport || "0");
  const [motif, setMotif] = useState(initialSimulation ? `Demande suite à simulation (${initialSimulation.nom_banque || "prêt"})` : "");
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [succesMsg, setSuccesMsg] = useState("");

  const chargerDemandes = async () => {
    try {
      setChargement(true);
      setErreur("");
      const { data } = await client.get("/demandes-credit/mes-demandes");
      setDemandes(data);
    } catch (err) {
      console.error("Erreur lors de la récupération de vos demandes:", err);
      setErreur(err.response?.data?.detail || "Impossible de charger vos demandes.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDemandes();
  }, []);

  const handleSoumettreDemande = async (e) => {
    e.preventDefault();
    setSoumissionEnCours(true);
    setErreur("");
    setSuccesMsg("");

    try {
      const payload = {
        montant_demande: parseFloat(montant),
        duree_souhaitee: parseInt(duree, 10),
        apport: parseFloat(apport || 0),
        motif: motif || "Prêt personnel",
      };

      if (initialSimulation?.id) {
        payload.simulation_id = initialSimulation.id;
      }

      await client.post("/demandes-credit/", payload);
      setSuccesMsg("Votre demande de crédit a été soumise avec succès et est en cours d'étude.");
      setAfficherFormulaire(false);
      // Reset form
      setMontant("");
      setDuree("");
      setApport("0");
      setMotif("");
      // Refresh list
      await chargerDemandes();
    } catch (err) {
      console.error("Erreur lors de la soumission de la demande:", err);
      setErreur(err.response?.data?.detail || "Erreur lors de la création de la demande.");
    } finally {
      setSoumissionEnCours(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="eyebrow mb-1">Espace Client</p>
          <h1 className="section-titre">Mes Demandes de Crédit</h1>
          <p className="text-ardoise text-sm mt-1">
            Suivez l'état d'avancement de vos dossiers de prêt ou effectuez une nouvelle demande.
          </p>
        </div>
        
        <button
          onClick={() => {
            setAfficherFormulaire(!afficherFormulaire);
            setSuccesMsg("");
            setErreur("");
          }}
          className="btn-primaire whitespace-nowrap shadow-sm"
        >
          {afficherFormulaire ? "Fermer le formulaire" : "+ Nouvelle demande"}
        </button>
      </div>

      {succesMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded text-sm">
          {succesMsg}
        </div>
      )}

      {erreur && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded text-sm">
          {erreur}
        </div>
      )}

      {/* Formulaire de soumission */}
      {afficherFormulaire && (
        <div className="carte p-6 sm:p-8 bg-white border border-or/30 shadow-md rounded-xl space-y-6">
          <h2 className="text-xl font-display text-indigo">Formuler une demande de prêt</h2>
          
          <form onSubmit={handleSoumettreDemande} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="montant" className="block text-sm text-ardoise font-medium mb-1">
                Montant souhaité (FCFA) *
              </label>
              <input
                id="montant"
                type="number"
                required
                min="10000"
                step="1000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="champ chiffres"
                placeholder="Ex. 5 000 000"
              />
            </div>

            <div>
              <label htmlFor="duree" className="block text-sm text-ardoise font-medium mb-1">
                Durée souhaitée (mois) *
              </label>
              <input
                id="duree"
                type="number"
                required
                min="3"
                max="360"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                className="champ chiffres"
                placeholder="Ex. 36"
              />
            </div>

            <div>
              <label htmlFor="apport" className="block text-sm text-ardoise font-medium mb-1">
                Apport personnel (FCFA)
              </label>
              <input
                id="apport"
                type="number"
                min="0"
                value={apport}
                onChange={(e) => setApport(e.target.value)}
                className="champ chiffres"
                placeholder="Ex. 500 000"
              />
            </div>

            <div>
              <label htmlFor="motif" className="block text-sm text-ardoise font-medium mb-1">
                Motif du prêt
              </label>
              <input
                id="motif"
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="champ"
                placeholder="Ex. Achat véhicule, travaux, projet..."
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAfficherFormulaire(false)}
                className="btn-secondaire text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={soumissionEnCours}
                className="btn-primaire text-sm"
              >
                {soumissionEnCours ? "Envoi en cours..." : "Soumettre la demande"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des demandes */}
      {chargement ? (
        <div className="text-center py-12 text-ardoise">Chargement de vos demandes de crédit...</div>
      ) : demandes.length === 0 ? (
        <div className="carte p-10 text-center space-y-3">
          <p className="text-ardoise">Vous n'avez encore soumis aucune demande de crédit.</p>
          <button
            onClick={() => setAfficherFormulaire(true)}
            className="text-indigo font-medium hover:text-or text-sm underline"
          >
            Créer votre première demande
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demandes.map((d) => (
            <div key={d.id} className="carte p-6 space-y-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-ardoise font-medium">Demande #{d.id.slice(0, 8)}</span>
                  <h3 className="text-lg font-bold text-indigo mt-0.5">{d.motif || "Prêt Personnel"}</h3>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    d.statut === "en_attente"
                      ? "bg-amber-100 text-amber-800"
                      : d.statut === "approuvee"
                      ? "bg-emerald-100 text-emerald-800"
                      : d.statut === "refusee"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {d.statut === "en_attente"
                    ? "En cours d'étude"
                    : d.statut === "approuvee"
                    ? "Approuvée"
                    : d.statut === "refusee"
                    ? "Refusée"
                    : d.statut}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-ardoise/10">
                <div>
                  <p className="text-xs text-ardoise">Montant demandé</p>
                  <p className="font-bold text-indigo chiffres">{formateurFCFA.format(d.montant_demande)} F</p>
                </div>
                <div>
                  <p className="text-xs text-ardoise">Durée</p>
                  <p className="font-bold text-indigo chiffres">{d.duree_souhaitee} mois</p>
                </div>
                <div>
                  <p className="text-xs text-ardoise">Apport</p>
                  <p className="font-semibold text-ardoise chiffres">{formateurFCFA.format(d.apport || 0)} F</p>
                </div>
                <div>
                  <p className="text-xs text-ardoise">Date de soumission</p>
                  <p className="font-semibold text-ardoise">
                    {new Date(d.date_creation).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
