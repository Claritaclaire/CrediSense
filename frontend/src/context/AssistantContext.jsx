import { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "./AuthContext";

const AssistantContext = createContext(null);

const formateurFCFA = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function extraireMontant(texte) {
  const correspondance = texte.match(/(\d+(?:[.,]\d+)?\s*[kKmM]|\d{1,3}(?:[\s.]\d{3})+|\d+)/);
  if (!correspondance) return null;

  const valeur = correspondance[1].replace(/\s/g, "").replace(",", ".");
  const suffixe = valeur.slice(-1).toLowerCase();
  const nombre = Number.parseFloat(suffixe === "k" || suffixe === "m" ? valeur.slice(0, -1) : valeur);
  if (!Number.isFinite(nombre)) return null;
  return nombre * (suffixe === "k" ? 1000 : suffixe === "m" ? 1000000 : 1);
}

function estQuestionCapacite(texte) {
  return /(?:combien|quel|quelle|hauteur|montant|capacit|emprunt|pr[eê]t)/i.test(texte) && extraireMontant(texte) !== null;
}

export function AssistantProvider({ children }) {
  const { pathname } = useLocation();
  const { estConnecte, user } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "bienvenue",
      role: "assistant",
      contenu: "Bonjour, je suis l'assistant CrediSense. Je peux vous expliquer les fonctionnalités de l'application et les notions liées au crédit.",
    },
  ]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const envoyerMessage = useCallback(async (texte, { forcerAssistant = false } = {}) => {
    const contenu = (texte ?? "").trim();
    if (!contenu || chargement) return;

    setQuestion("");
    setErreur("");
    setMessages((precedents) => [
      ...precedents,
      { id: `question-${Date.now()}`, role: "user", contenu },
    ]);
    setChargement(true);

    try {
      let reponse;
      // forcerAssistant : utilisé pour les questions déjà construites avec un contexte
      // précis (nudges contextuels) — on ne laisse pas l'heuristique de détection de
      // "question de capacité" réinterpréter un nombre qui n'est pas un revenu.
      if (!forcerAssistant && estQuestionCapacite(contenu)) {
        const profil = JSON.parse(localStorage.getItem(`credisense_profil_${user.id}`) || "{}");
        const { data } = await client.post("/simulations/capacite", {
          revenu_mensuel: extraireMontant(contenu),
          montant_souhaite: 1,
          charges_mensuelles: Number(profil.charges) || 0,
          total_mensualites_prets_en_cours: 0,
        });
        const meilleureDuree = (data.durees || []).reduce(
          (meilleure, ligne) => ligne.montant_dans_capacite_avec_prets > (meilleure?.montant_dans_capacite_avec_prets || 0) ? ligne : meilleure,
          null
        );
        const montantMax = meilleureDuree?.montant_dans_capacite_avec_prets || 0;
        reponse = montantMax > 0
          ? `Avec un revenu mensuel de ${formateurFCFA.format(data.revenu_mensuel)} FCFA et sans autres charges déclarées, votre capacité indicative peut atteindre environ ${formateurFCFA.format(montantMax)} FCFA sur ${meilleureDuree.duree_mois} mois. Le montant exact dépendra de l'offre choisie, de la durée et de l'étude de votre dossier.`
          : "Avec ce revenu, aucune capacité positive n'est calculée dans les hypothèses actuelles. Les charges et prêts existants peuvent réduire davantage le montant accessible.";
      } else {
        // Historique recent (avant l'ajout du message courant) pour que l'assistant,
        // sans etat entre deux appels, tienne compte de ce qui a deja ete dit.
        const historique = messages
          .filter((m) => m.id !== "bienvenue")
          .slice(-6)
          .map((m) => ({ role: m.role, contenu: m.contenu }));
        const { data } = await client.post("/ia/assistant", {
          question: contenu,
          page: pathname,
          historique,
        });
        reponse = data.contenu_reponse;
      }
      setMessages((precedents) => [
        ...precedents,
        { id: `reponse-${Date.now()}`, role: "assistant", contenu: reponse },
      ]);
    } catch (error) {
      setErreur(
        error.response?.data?.detail ||
          "L'assistant est momentanément indisponible. Vous pouvez contacter le call center."
      );
    } finally {
      setChargement(false);
    }
  }, [chargement, pathname, user, messages]);

  const demanderRecommandation = useCallback(async () => {
    if (chargement) return;

    setErreur("");
    setMessages((precedents) => [
      ...precedents,
      { id: `question-${Date.now()}`, role: "user", contenu: "Recommander une offre pour mon profil" },
    ]);
    setChargement(true);

    try {
      const profil = JSON.parse(localStorage.getItem(`credisense_profil_${user.id}`) || "{}");
      const simulationPayload = JSON.parse(localStorage.getItem("simulationPayload") || "null");
      const revenu = Number(localStorage.getItem("simulationRevenu")) || Number(profil.revenu) || 0;
      const apport = Number(localStorage.getItem("simulationApport")) || 0;

      if (!revenu || !simulationPayload?.montant || !simulationPayload?.duree_mois) {
        throw new Error("Renseignez votre profil financier et effectuez une simulation avant de demander une recommandation.");
      }

      let totalMensualitesPrets = 0;
      try {
        const { data: prets } = await client.get("/historique-prets/");
        totalMensualitesPrets += (prets || [])
          .filter((pret) => pret.statut === "en_cours")
          .reduce((total, pret) => total + (pret.mensualite || 0), 0);
      } catch (error) {
        console.warn("Impossible de charger les prêts en cours", error);
      }

      const pretsLocaux = JSON.parse(localStorage.getItem(`credisense_prets_${user.id}`) || "[]");
      totalMensualitesPrets += pretsLocaux
        .filter((pret) => pret.statut === "en_cours")
        .reduce((total, pret) => total + (pret.mensualite || 0), 0);

      const { data } = await client.post("/ia/recommandation", {
        revenu_mensuel: revenu,
        apport,
        montant_souhaite: Number(simulationPayload.montant),
        duree_mois: Number(simulationPayload.duree_mois),
        offre_id: simulationPayload.offre_id || null,
        projet: localStorage.getItem("simulationProjet") || null,
        profession: profil.profession || null,
        charges_mensuelles: Number(profil.charges) || 0,
        total_mensualites_prets_en_cours: totalMensualitesPrets,
      });

      setMessages((precedents) => [
        ...precedents,
        { id: `reponse-${Date.now()}`, role: "assistant", contenu: data.contenu_reponse },
      ]);
    } catch (error) {
      setErreur(
        error.response?.data?.detail ||
          error.message ||
          "Impossible de générer une recommandation pour le moment."
      );
    } finally {
      setChargement(false);
    }
  }, [chargement, user]);

  // Ouvre le panneau et envoie immédiatement une question déjà formulée par la page
  // appelante (nudge contextuel) : l'utilisateur voit tout de suite la réponse, sans
  // avoir à retaper sa question.
  const ouvrirAvecQuestion = useCallback((texte) => {
    setOuvert(true);
    envoyerMessage(texte, { forcerAssistant: true });
  }, [envoyerMessage]);

  const nouvelleConversation = useCallback(() => {
    setMessages([
      {
        id: "bienvenue",
        role: "assistant",
        contenu: "Bonjour, je suis l'assistant CrediSense. Comment puis-je vous aider ?",
      },
    ]);
    setErreur("");
  }, []);

  const value = {
    estConnecte,
    ouvert,
    setOuvert,
    question,
    setQuestion,
    messages,
    chargement,
    erreur,
    envoyerMessage,
    demanderRecommandation,
    ouvrirAvecQuestion,
    nouvelleConversation,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant doit être utilisé à l'intérieur d'un AssistantProvider");
  }
  return context;
}
