import React, { useState } from "react";
import { useLocation, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./AdminLayout.css";

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Define admin routes
  const adminRoutes = [
    { path: "/admin", label: "Tableau de bord", icon: "🏠" },
    { path: "/admin/simulations", label: "Calculs", icon: "📊" },
    { path: "/admin/demandes-credit", label: "Demandes", icon: "📝" },
    { path: "/admin/offres", label: "Offres", icon: "💰" },
    { path: "/admin/ia", label: "Recommandations IA", icon: "🤖" },
    { path: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
    { path: "/admin/config", label: "Configuration", icon: "⚙️" },
    { path: "/admin/audit", label: "Journal d'audit", icon: "📋" },
  ];

  // Get current route info matching exact path or specific subpath
  const currentRoute = [...adminRoutes]
    .sort((a, b) => b.path.length - a.path.length)
    .find(route => pathname === route.path || (route.path !== "/admin" && pathname.startsWith(route.path)))
    || adminRoutes[0];
  
  // Generate breadcrumb
  const breadcrumbItems = [
    { label: "Administration", path: "/admin" }
  ];
  
  if (currentRoute && currentRoute.path !== "/admin") {
    breadcrumbItems.push(currentRoute);
  }

  const initiales = user?.nom
    ? user.nom.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img src="/logo-credisense.png" alt="CrediSense" className="h-10 w-auto logo-frame logo-glow" />
            <div>
              <span className="admin-badge">Panneau Admin</span>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            {adminRoutes.map(route => (
              <NavLink
                key={route.path}
                to={route.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                end
              >
                <span className="icon">{route.icon}</span>
                <span>{route.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-card-header">
              <div className="user-avatar">{initiales}</div>
              <div className="user-details">
                <div className="user-name">{user?.nom || "Administrateur"}</div>
                <div className="user-role-tag">{user?.role?.toUpperCase() || "ADMIN"}</div>
              </div>
            </div>
            <button onClick={logout} className="logout-btn">
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      
      <main className="admin-main">
        {/* Mobile Header Bar */}
        <div className="admin-mobile-bar">
          <div className="admin-mobile-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="admin-mobile-toggle"
              aria-label="Toggle admin menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="admin-mobile-title">CrediSense Admin</span>
          </div>
          <Link to="/simulation" className="admin-mobile-link">
            Site public →
          </Link>
        </div>

        <div className="admin-header">
          <div className="admin-header-title">
            <h1>{currentRoute?.label || "Administration"}</h1>
            <div className="breadcrumb">
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="breadcrumb-separator">/</span>}
                  {item.path === pathname ? (
                    <span className="breadcrumb-active">{item.label}</span>
                  ) : (
                    <span
                      className="breadcrumb-link"
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="header-actions">
            <Link to="/simulation" className="public-site-link">
              <span>🌐</span> Voir le site public
            </Link>
          </div>
        </div>
        
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}