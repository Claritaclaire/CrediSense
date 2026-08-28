import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const SUGGESTIONS = [
  "Comment fonctionne une simulation ?",
  "Que signifie le TAEG ?",
  "Quelles pièces dois-je préparer ?",
];

function IconeAssistant() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 8.5a5 5 0 0 1 10 0v1.25a5 5 0 0 1-10 0V8.5Z" />
      <path d="M9 15.5c.8 1.1 2 1.75 3 1.75s2.2-.65 3-1.75M5.5 10.5H4a2 2 0 0 0 0 4h1.5M18.5 10.5H20a2 2 0 0 1 0 4h-1.5M12 17.25v2.25M9.5 19.5h5" />
      <circle cx="9.5" cy="10" r=".55" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r=".55" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeEnvoyer() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z" />
      <path d="M10.3 13.7 21 3" />
    </svg>
  );
}

export default function AssistantFlottant() {
  const { pathname } = useLocation();
  const { estConnecte } = useAuth();
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
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  if (!estConnecte) return null;

  useEffect(() => {
    if (ouvert) inputRef.current?.focus();
  }, [ouvert]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, chargement]);

  async function envoyerMessage(texte = question) {
    const contenu = texte.trim();
    if (!contenu || chargement) return;

    setQuestion("");
    setErreur("");
    setMessages((precedents) => [
      ...precedents,
      { id: `question-${Date.now()}`, role: "user", contenu },
    ]);
    setChargement(true);

    try {
      const { data } = await client.post("/ia/assistant", {
        question: contenu,
        page: pathname,
      });
      setMessages((precedents) => [
        ...precedents,
        { id: `reponse-${Date.now()}`, role: "assistant", contenu: data.contenu_reponse },
      ]);
    } catch (error) {
      setErreur(
        error.response?.data?.detail ||
          "L'assistant est momentanément indisponible. Vous pouvez contacter le call center."
      );
    } finally {
      setChargement(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    envoyerMessage();
  }

  function nouvelleConversation() {
    setMessages([
      {
        id: "bienvenue",
        role: "assistant",
        contenu: "Bonjour, je suis l'assistant CrediSense. Comment puis-je vous aider ?",
      },
    ]);
    setErreur("");
  }

  return (
    <div className="fixed bottom-5 right-24 z-[60] flex flex-col items-end gap-3 sm:right-24">
      {ouvert && (
        <section
          className="assistant-panneau carte flex w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden border-0 shadow-2xl animate-scale-in"
          aria-label="Assistant CrediSense"
        >
          <header className="flex items-center justify-between bg-indigo px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-or text-indigo">
                <IconeAssistant />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Assistant CrediSense</p>
                <p className="text-xs text-white/70">En ligne pour vous orienter</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={nouvelleConversation} className="rounded-md p-2 text-white/75 hover:bg-white/10 hover:text-white" aria-label="Nouvelle conversation" title="Nouvelle conversation">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5" /></svg>
              </button>
              <button type="button" onClick={() => setOuvert(false)} className="rounded-md p-2 text-lg leading-none text-white/75 hover:bg-white/10 hover:text-white" aria-label="Fermer l'assistant">×</button>
            </div>
          </header>

          <div ref={messagesRef} className="assistant-messages flex flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-indigo text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
                  {message.contenu}
                </p>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => envoyerMessage(suggestion)} className="rounded-full border border-indigo/20 bg-white px-3 py-1.5 text-left text-xs font-medium text-indigo transition hover:border-or hover:bg-or/10">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {chargement && <p className="w-fit rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm italic text-ardoise">Je recherche une réponse...</p>}
            {erreur && <p className="rounded-lg border-l-4 border-rose-500 bg-rose-50 px-3 py-2 text-xs text-rose-800">{erreur}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="assistant-question" className="sr-only">Votre question</label>
            <textarea ref={inputRef} id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSubmit(event); } }} rows={1} maxLength={1000} placeholder="Posez votre question..." className="champ max-h-24 min-h-[44px] resize-none py-2.5 text-sm" disabled={chargement} />
            <button type="submit" disabled={!question.trim() || chargement} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-or text-indigo shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Envoyer la question" title="Envoyer la question">
              <IconeEnvoyer />
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOuvert((etat) => !etat)} className="flex h-14 w-14 items-center justify-center rounded-full bg-or text-indigo shadow-xl ring-2 ring-white/80 transition hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-or/40 animate-pulse-glow" aria-expanded={ouvert} aria-label={ouvert ? "Fermer l'assistant" : "Ouvrir l'assistant"} title="Assistant CrediSense">
        {ouvert ? <span className="text-2xl leading-none">×</span> : <IconeAssistant />}
      </button>
    </div>
  );
}
