import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const PRODUITS_CCA_DEFAUT = [
  {
    cle: "scolaire",
    id: "defaut-scolaire",
    nom_banque: "Crédit Scolaire CCA",
    taux_annuel: 7.5,
    montant_max: 3000000,
    duree_min_mois: 3,
    duree_max_mois: 12,
    badge: "Rentrée & Études",
    desc: "Financement sur mesure pour la scolarité de vos enfants, inscriptions universitaires et achat de fournitures.",
    icone: "🎓",
  },
  {
    cle: "fonctionnaire",
    id: "defaut-fonctionnaire",
    nom_banque: "CCT Fonctionnaire",
    taux_annuel: 6.5,
    montant_max: 15000000,
    duree_min_mois: 12,
    duree_max_mois: 60,
    badge: "Taux Préférentiel",
    desc: "Crédit à court & moyen terme réservé aux agents du secteur public avec des conditions financières privilégiées.",
    icone: "🏛️",
  },
  {
    cle: "urgence",
    id: "defaut-urgence",
    nom_banque: "Crédit d'Urgence",
    taux_annuel: 8.0,
    montant_max: 1500000,
    duree_min_mois: 3,
    duree_max_mois: 18,
    badge: "Déblocage Rapide",
    desc: "Avance rapide de trésorerie pour faire face aux dépenses imprévues, santé ou événements familiaux.",
    icone: "⚡",
  },
  {
    cle: "découvert",
    id: "defaut-decouvert",
    nom_banque: "Découvert Autorisé",
    taux_annuel: 9.0,
    montant_max: 1000000,
    duree_min_mois: 1,
    duree_max_mois: 3,
    badge: "Gestion Mensuelle",
    desc: "Souplesse financière de fin de mois pour faire face à vos décalages de trésorerie en toute sérénité.",
    icone: "💳",
  },
];

function IconeTaux({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
function IconeRapide({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconeSecurite({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconeAccompagnement({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M15.3 14.2c2.4.4 3.7 1.9 3.7 3.8" />
    </svg>
  );
}

const AVANTAGES = [
  { Icone: IconeTaux, titre: "Taux compétitifs", texte: "Des taux étudiés selon votre profil, comparés objectivement par TAEG." },
  { Icone: IconeRapide, titre: "Réponse rapide", texte: "Traitement de votre demande sous 24 à 72 heures ouvrées." },
  { Icone: IconeSecurite, titre: "Sécurité garantie", texte: "Vos données personnelles et financières sont protégées et confidentielles." },
  { Icone: IconeAccompagnement, titre: "Accompagnement", texte: "Assistant IA et call center CCA Bank disponibles pour vous guider." },
];

export default function Accueil() {
  const { estConnecte } = useAuth();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoading(true);
        const { data } = await client.get("/offres/");
        if (Array.isArray(data) && data.length > 0) {
          setOffres(data);
        } else {
          setOffres(PRODUITS_CCA_DEFAUT);
        }
      } catch (err) {
        console.error("Chargement offres:", err);
        setOffres(PRODUITS_CCA_DEFAUT);
      } finally {
        setLoading(false);
      }
    };
    fetchOffres();
  }, []);

  return (
    <div className="space-y-16 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-papier px-6 sm:px-12 py-16 sm:py-24 shadow-xl border border-amber-500/20">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/bg-credit-card.jpg"
          aria-hidden="true"
        >
          <source src="/hero-cca.mp4" type="video/mp4" />
        </video>

        {/* Teinte institutionnelle : elle garantit un texte lisible sur toute la vidéo. */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo/95 via-indigo-dark/85 to-slate-950/85 pointer-events-none" />

        {/* Glow Effects */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-or rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse-glow" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative max-w-3xl space-y-6">
          <span className="eyebrow bg-or/20 text-or border-or/30 font-bold px-3.5 py-1 text-xs uppercase tracking-wider">
            ✨ CCA Bank — La finance au cœur des traditions africaines
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold font-display leading-tight text-white tracking-tight">
            Calculez, comparez et préparez votre crédit <span className="text-or">en toute sécurité</span>.
          </h1>

          <p className="text-papier/85 text-base sm:text-xl leading-relaxed max-w-2xl font-light">
            Découvrez nos  solutions de crédit phares. Simulez vos mensualités au franc près et suivez votre demande avec accompagnement bancaire.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              to={estConnecte ? "/dashboard" : "/simulation"}
              className="bg-or text-indigo font-bold px-7 py-3.5 rounded-xl shadow-lg hover:bg-amber-400 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 group"
            >
              <span>{estConnecte ? "Mon Tableau de Bord →" : "Simuler un crédit libre"}</span>
            </Link>

            <Link
              to="/comparaison"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all duration-200"
            >
              Comparer toutes les offres
            </Link>
          </div>
        </div>
      </section>

      {/* ÉTAPE 1 DU PARCOURS : Grille des 4 produits de crédit de la banque */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="eyebrow">Nos Produits de Crédit</span>
          <h2 className="text-3xl md:text-4xl font-display leading-tight text-indigo font-bold tracking-tight">Choisissez la formule adaptée à votre projet</h2>
          <p className="text-ardoise text-sm max-w-xl mx-auto">
            Consultez les taux et conditions ci-dessous. Aucun compte n'est requis pour découvrir les caractéristiques de chaque prêt.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offres.map((item, idx) => {
            const nomOffre = item.nom_banque.toLowerCase();
            const defaultMatch = PRODUITS_CCA_DEFAUT.find((produit) => nomOffre.includes(produit.cle));
            const offreDisponible = !String(item.id).startsWith("defaut-");
            const icone = item.icone || defaultMatch?.icone || "💰";
            const badge = item.badge || defaultMatch?.badge || "Produit CCA";
            const desc = item.description || defaultMatch?.desc || "Formule de prêt bancaire souple et accessible en zone FCFA.";

            return (
              <div
                key={item.id}
                className="carte p-6 flex flex-col justify-between border-t-4 border-t-or hover:-translate-y-1 transition-all duration-300 shadow-lg group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                      {icone}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-or bg-or/10 px-2.5 py-1 rounded-full border border-or/20">
                      {badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-indigo group-hover:text-or transition-colors">
                      {item.nom_banque}
                    </h3>
                    <p className="text-ardoise text-xs mt-1 leading-relaxed line-clamp-3">
                      {desc}
                    </p>
                  </div>

                  {/* Taux & Conditions */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ardoise">Taux nominal :</span>
                      <strong className="text-indigo font-bold font-display">{(item.taux_annuel <= 1 ? item.taux_annuel * 100 : item.taux_annuel).toFixed(1)} %</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ardoise font-medium">Plafond :</span>
                      <strong className="text-indigo font-bold">
                        {item.montant_max.toLocaleString("fr-FR")} FCFA
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ardoise">Durée :</span>
                      <span className="text-ardoise font-medium">
                        {item.duree_min_mois} - {item.duree_max_mois} mois
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton vers la page produit dédiée (Étape 2) */}
                <div className="pt-5 mt-4 border-t border-slate-100">
                  {offreDisponible ? (
                    <Link
                      to={`/offres/${item.id}`}
                      className="w-full bg-indigo text-white hover:bg-or hover:text-indigo font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm group-hover:shadow"
                    >
                      <span>Découvrir l'offre</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  ) : (
                    <span className="block w-full rounded-lg bg-slate-200 px-4 py-2.5 text-center text-xs font-semibold text-ardoise">
                      Détails momentanément indisponibles
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="carte p-8 sm:p-12 bg-white rounded-2xl border border-ardoise/15 shadow-sm space-y-8">
        <div className="text-center space-y-2">
          <span className="eyebrow">Parcours Transparent</span>
          <h2 className="text-3xl md:text-4xl font-display leading-tight text-indigo font-bold tracking-tight">Comment obtenir votre prêt CCA Bank</h2>
        </div>

        <ol className="grid sm:grid-cols-4 gap-6">
          {[
            { n: "01", t: "Découvrez nos offres", d: "Consultez les taux et conditions de nos 4 crédits sans inscription." },
            { n: "02", t: "Simulez vos chiffres", d: "Ajustez le montant et la durée pour estimer votre mensualité." },
            { n: "03", t: "Connectez votre espace", d: "Créez votre compte client pour enregistrer vos résultats et votre profil." },
            { n: "04", t: "Suivez votre demande", d: "Accédez à votre tableau de bord et déposez votre dossier de crédit." },
          ].map((etape) => (
            <li key={etape.n} className="space-y-3 relative p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
              <span className="inline-block px-3 py-1 bg-or text-indigo font-bold text-sm rounded-lg shadow-sm font-display">
                Étape {etape.n}
              </span>
              <h3 className="font-bold text-indigo text-base">{etape.t}</h3>
              <p className="text-ardoise text-xs leading-relaxed">{etape.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pourquoi choisir CCA Bank */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="eyebrow">Pourquoi choisir CCA Bank ?</span>
          <h2 className="text-3xl md:text-4xl font-display leading-tight text-indigo font-bold tracking-tight">Des avantages qui font la différence</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {AVANTAGES.map(({ Icone, titre, texte }) => (
            <div key={titre} className="text-center space-y-3">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-or/15 text-or">
                <Icone className="h-6 w-6" />
              </span>
              <h3 className="font-bold text-indigo">{titre}</h3>
              <p className="text-ardoise text-xs leading-relaxed">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bannière d'appel à l'action */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo to-indigo-dark px-6 sm:px-12 py-12 sm:py-16 text-center text-white shadow-xl border border-amber-500/20">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-or rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative space-y-5 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white">
            Prêt à concrétiser votre projet ?
          </h2>
          <p className="text-white/85 text-sm sm:text-base">
            Simulez votre crédit en 2 minutes, comparez les offres, et obtenez une réponse à votre demande sous 24 à 72 heures ouvrées.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to={estConnecte ? "/simulation" : "/register?redirect=%2Fsimulation"}
              className="bg-or text-indigo font-bold px-7 py-3.5 rounded-xl shadow-lg hover:bg-amber-400 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Simuler maintenant →
            </Link>
            <a
              href="tel:+237679009630"
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all duration-200"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
