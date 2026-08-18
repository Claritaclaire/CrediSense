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
          <img src="/logo-credisense.png" alt="CrediSense" className="h-10 sm:h-12 w-auto logo-frame logo-glow" />
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
    </div>
  );
}