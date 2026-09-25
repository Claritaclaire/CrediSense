const QUESTIONS = [
  {
    q: "Dois-je être client de CCA Bank pour utiliser CrediSense ?",
    r: "Non. L'inscription sur CrediSense donne accès aux fonctionnalités de simulation, comparaison et suivi, sans obligation d'être déjà client CCA Bank. Vous pouvez explorer vos options avant de déposer une demande.",
  },
  {
    q: "Que signifie le TAEG, et pourquoi diffère-t-il du taux affiché sur l'offre ?",
    r: "Le TAEG (Taux Annuel Effectif Global) inclut le taux d'intérêt nominal, les frais de dossier et l'assurance — c'est le coût réel du crédit. Deux offres avec le même taux nominal peuvent avoir un TAEG différent selon leurs frais et leur assurance : c'est toujours le TAEG qu'il faut comparer, jamais le taux nominal seul.",
  },
  {
    q: "Comment est calculée ma capacité d'emprunt (quotité cessible) ?",
    r: "Elle suit le barème progressif du Décret n°94/197/PM du Cameroun, appliqué par tranche de revenu : 10 % jusqu'à 18 750 FCFA, 20 % de 18 751 à 37 500 FCFA, 25 % de 37 501 à 75 000 FCFA, 1/3 de 75 001 à 112 500 FCFA, 50 % de 112 501 à 142 500 FCFA, et 100 % au-delà. Vos charges fixes et vos mensualités de prêts en cours sont ensuite déduites pour obtenir votre mensualité réellement disponible.",
  },
  {
    q: "Quelles pièces justificatives dois-je préparer pour une demande de crédit ?",
    r: "Généralement : pièce d'identité, justificatifs de revenus, justificatif de situation professionnelle, relevés bancaires récents, justificatif d'apport personnel (si applicable), documents relatifs au projet financé, documents relatifs à vos crédits en cours (si applicable), et un justificatif de domicile. Les pièces exactes peuvent varier selon le type de crédit et votre profil — votre conseiller CCA Bank vous confirmera la liste précise.",
  },
  {
    q: "La simulation m'engage-t-elle à quelque chose ?",
    r: "Non. Une simulation est purement indicative : elle vous donne une estimation de mensualité, de TAEG et de coût total, mais ne constitue ni une offre ferme ni un engagement de votre part ou de celui de la banque. Seul le dépôt d'une demande de crédit lance une véritable étude de dossier.",
  },
  {
    q: "Puis-je comparer plusieurs offres avant de choisir ?",
    r: "Oui — la page Comparaison vous permet de sélectionner plusieurs offres, de leur donner les mêmes paramètres (montant, durée), et de les classer automatiquement par TAEG croissant pour voir laquelle est réellement la plus avantageuse.",
  },
  {
    q: "Mes données personnelles et financières sont-elles en sécurité ?",
    r: "Votre mot de passe n'est jamais stocké en clair (il est haché), la connexion à votre compte utilise un jeton d'authentification sécurisé, et l'accès aux données est limité selon votre rôle. Les échanges avec l'application passent par une connexion chiffrée (HTTPS).",
  },
  {
    q: "Que se passe-t-il après le dépôt d'une demande de crédit ?",
    r: "Votre demande est transmise à l'équipe CCA Bank pour étude. Le délai moyen de réponse est de 24 à 72 heures ouvrées. Vous pouvez suivre son statut à tout moment depuis « Mes Demandes » (en attente, en cours de traitement, pièces complémentaires demandées, approuvée ou refusée). Vous serez notifié par email dès qu'une décision est prise.",
  },
  {
    q: "Comment contacter le call center CCA Bank ?",
    r: "Par téléphone au +237 679 00 96 30, ou par email à callcenter@cca-bank.com. Vous pouvez aussi utiliser le bouton d'assistance rapide présent dans l'application une fois connecté.",
  },
];

export default function FAQ() {
  return (
    <div className="space-y-8">
      <div className="mb-2 rounded-2xl border border-white/20 bg-indigo/80 px-6 py-7 shadow-lg backdrop-blur-sm">
        <p className="eyebrow mb-2">Aide</p>
        <h1 className="section-titre">Questions fréquentes</h1>
        <p className="mt-2 max-w-xl text-white/80">
          Les réponses aux questions les plus courantes sur CrediSense, le TAEG, la quotité cessible et vos démarches auprès de CCA Bank.
        </p>
      </div>

      <div className="carte divide-y divide-slate-100 p-2 sm:p-4">
        {QUESTIONS.map(({ q, r }) => (
          <details key={q} className="group px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold text-indigo">
              <span>{q}</span>
              <span className="shrink-0 text-xl text-or leading-none group-open:hidden">+</span>
              <span className="hidden shrink-0 text-xl text-or leading-none group-open:inline">−</span>
            </summary>
            <p className="pb-4 pr-8 text-sm leading-relaxed text-ardoise">{r}</p>
          </details>
        ))}
      </div>

      <p className="text-center text-sm text-white/80">
        Vous ne trouvez pas la réponse à votre question ?{" "}
        <a href="mailto:callcenter@cca-bank.com" className="font-semibold text-or underline hover:text-amber-300">
          Écrivez au call center CCA Bank
        </a>
        .
      </p>
    </div>
  );
}
