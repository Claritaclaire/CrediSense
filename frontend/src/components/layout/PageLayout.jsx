import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function NavLink({ to, children, onClick }) {
  const { pathname } = useLocation();
  const actif = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`nav-lien block md:inline-block ${actif ? "nav-lien-actif" : ""}`}
    >
      {children}
    </Link>
  );
}

export function EnTete() {
  const { user, estConnecte, logout } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const fermeMenu = () => setMenuOuvert(false);

  return (
    <header className="bg-[#350B4C]/95 text-papier sticky top-0 z-50 backdrop-blur-md border-b border-amber-500/20 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity" onClick={fermeMenu}>
          <img src="/logo-cca-bank.png" alt="CCA Bank" className="h-10 sm:h-12 w-auto" />
        </Link>

        {/* Bouton Hamburger Mobile */}
        <button
          type="button"
          onClick={() => setMenuOuvert(!menuOuvert)}
          className="md:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {menuOuvert ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-3">
          {estConnecte ? (
            <>
              <NavLink to="/dashboard">Tableau de bord</NavLink>
              <NavLink to="/simulation">Simuler</NavLink>
              <NavLink to="/comparaison">Comparer</NavLink>
              <NavLink to="/historique">Historique</NavLink>
              <NavLink to="/mes-demandes">Mes Demandes</NavLink>
              <NavLink to="/clause">Clauses</NavLink>
              <NavLink to="/profil">Mon Profil</NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin">Administration</NavLink>
              )}
              <button onClick={logout} className="nav-lien ml-1 sm:ml-2">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Connexion</NavLink>
              <Link
                to="/register"
                className="ml-2 bg-or text-indigo text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Menu Mobile Deroulant */}
      {menuOuvert && (
        <div className="md:hidden bg-[#2D0A43]/98 border-b border-amber-500/20 px-4 pt-2 pb-4 space-y-2 animate-fade-in">
          {estConnecte ? (
            <>
              <NavLink to="/dashboard" onClick={fermeMenu}>Tableau de bord</NavLink>
              <NavLink to="/simulation" onClick={fermeMenu}>Simuler</NavLink>
              <NavLink to="/comparaison" onClick={fermeMenu}>Comparer</NavLink>
              <NavLink to="/historique" onClick={fermeMenu}>Historique</NavLink>
              <NavLink to="/mes-demandes" onClick={fermeMenu}>Mes Demandes</NavLink>
              <NavLink to="/clause" onClick={fermeMenu}>Clauses</NavLink>
              <NavLink to="/profil" onClick={fermeMenu}>Mon Profil</NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin" onClick={fermeMenu}>Administration</NavLink>
              )}
              <button
                onClick={() => {
                  fermeMenu();
                  logout();
                }}
                className="w-full text-left nav-lien text-rose-400 hover:text-rose-300 mt-2"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={fermeMenu}>Connexion</NavLink>
              <Link
                to="/register"
                onClick={fermeMenu}
                className="block text-center mt-2 bg-or text-indigo font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export function PiedDePage() {
  return (
    <footer className="mt-16 bg-[#350B4C]/95 text-white backdrop-blur-md border-t border-amber-500/20 shadow-inner">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-200">
        <div className="flex items-center gap-3">
          <img src="/logo-credisense.png" alt="CrediSense" className="h-8 w-auto logo-frame logo-glow" />
          <span className="text-xs sm:text-sm font-medium">
            CrediSense — <span className="text-or italic">La finance au cœur des traditions africaines.</span>
          </span>
        </div>
        <p className="chiffres text-xs text-slate-300">CCA Bank · TAEG · Mensualités · Recommandation IA · FCFA</p>
      </div>
    </footer>
  );
}

function ContactCallCenter() {
  const { estConnecte } = useAuth();
  const [ouvert, setOuvert] = useState(false);

  if (!estConnecte) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {ouvert && (
        <div className="w-72 rounded-2xl border border-white/80 bg-white p-4 text-slate-900 shadow-2xl animate-scale-in">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-indigo">Signaler une demande</p>
              <p className="mt-1 text-xs text-ardoise">Notre call center peut vous accompagner.</p>
            </div>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="text-lg leading-none text-ardoise hover:text-indigo"
              aria-label="Fermer le contact call center"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <a
              href="tel:+237679009630"
              className="flex items-center justify-between rounded-lg bg-indigo px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-dark"
            >
              <span>Appeler le call center</span>
              <span aria-hidden="true">+237 679 00 96 30</span>
            </a>
            <a
              href="mailto:callcenter@cca-bank.com?subject=Signalement%20d%27une%20demande"
              className="flex items-center justify-between rounded-lg border border-indigo/20 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-indigo hover:border-or hover:bg-or/10"
            >
              <span>Écrire par email</span>
              <span aria-hidden="true">✉</span>
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOuvert((etat) => !etat)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-or text-indigo shadow-xl ring-2 ring-white/70 transition hover:bg-amber-400 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-or/40"
        aria-expanded={ouvert}
        aria-label="Signaler une demande au call center"
        title="Signaler une demande"
      >
        {ouvert ? (
          <span className="text-2xl leading-none" aria-hidden="true">×</span>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15.5a2 2 0 0 1-2 2h-1.2a2 2 0 0 0-1.4.6l-1.7 1.7a1 1 0 0 1-1.7-.7v-.6a2 2 0 0 0-2-2H7a4 4 0 0 1-4-4v-5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
            <path d="M8 9h8M8 12h5" />
          </svg>
        )}
        <span className="pointer-events-none absolute right-0 bottom-full mb-3 whitespace-nowrap rounded-md bg-indigo px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {ouvert ? "Fermer" : "Signaler une demande"}
        </span>
      </button>
    </div>
  );
}

export default function PageLayout({ children, large = false }) {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <div className="min-h-screen w-full bg-transparent">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <EnTete />
      <main className={`flex-1 ${large ? "max-w-6xl" : "max-w-5xl"} mx-auto w-full px-4 sm:px-6 py-8 sm:py-12`}>
        {children}
      </main>
      <PiedDePage />
      <ContactCallCenter />
    </div>
  );
}