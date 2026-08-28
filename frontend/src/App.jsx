import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PageLayout from "./components/layout/PageLayout.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";

import Accueil from "./pages/Accueil.jsx";
import OffreDetail from "./pages/OffreDetail.jsx";
import DashboardClient from "./pages/DashboardClient.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Simulation from "./pages/Simulation.jsx";
import Comparaison from "./pages/Comparaison.jsx";
import Historique from "./pages/Historique.jsx";
import MesDemandes from "./pages/MesDemandes.jsx";
import Clause from "./pages/Clause.jsx";
import Profil from "./pages/Profil.jsx";
import AdminUserManagement from "./pages/admin/AdminUserManagement.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminSimulations from "./pages/admin/AdminSimulations.jsx";
import AdminDemandesCredit from "./pages/admin/AdminDemandesCredit.jsx";
import AdminOffres from "./pages/admin/AdminOffres.jsx";
import AdminOffreEdit from "./pages/admin/AdminOffreEdit.jsx";
import AdminIA from "./pages/admin/AdminIA.jsx";
import AdminConfig from "./pages/admin/AdminConfig.jsx";
import AdminAudit from "./pages/admin/AdminAudit.jsx";
import AssistantFlottant from "./components/AssistantFlottant.jsx";

function RouteProtegee({ children }) {
  const { estConnecte, loading } = useAuth();
  if (loading) {
    return <div className="text-center py-12 text-white font-medium">Chargement...</div>;
  }
  return estConnecte ? children : <Navigate to="/login" replace />;
}

// Route protégée pour administrateurs uniquement
function RouteAdmin({ children }) {
  const { user, estConnecte, loading } = useAuth();
  if (loading) {
    return <div className="text-center py-12 text-white font-medium">Chargement de la session administrateur...</div>;
  }
  if (!estConnecte) {
    return <Navigate to="/login" replace />;
  }
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <PageLayout large>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/offres/:id" element={<OffreDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <RouteProtegee>
                <DashboardClient />
              </RouteProtegee>
            }
          />
          <Route
            path="/simulation"
            element={
              <RouteProtegee>
                <Simulation />
              </RouteProtegee>
            }
          />
          <Route
            path="/comparaison"
            element={
              <RouteProtegee>
                <Comparaison />
              </RouteProtegee>
            }
          />
          <Route
            path="/historique"
            element={
              <RouteProtegee>
                <Historique />
              </RouteProtegee>
            }
          />
          <Route
            path="/mes-demandes"
            element={
              <RouteProtegee>
                <MesDemandes />
              </RouteProtegee>
            }
          />
          <Route
            path="/clause"
            element={
              <RouteProtegee>
                <Clause />
              </RouteProtegee>
            }
          />
          <Route
            path="/profil"
            element={
              <RouteProtegee>
                <Profil />
              </RouteProtegee>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RouteAdmin>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="simulations" element={<AdminSimulations />} />
                    <Route path="demandes-credit" element={<AdminDemandesCredit />} />
                    <Route path="offres/:id/edit" element={<AdminOffreEdit />} />
                    <Route path="offres" element={<AdminOffres />} />
                    <Route path="ia" element={<AdminIA />} />
                    <Route path="config" element={<AdminConfig />} />
                    <Route path="audit" element={<AdminAudit />} />
                    <Route path="utilisateurs" element={<AdminUserManagement />} />
                  </Routes>
                </AdminLayout>
              </RouteAdmin>
            }
          />
        </Routes>
      </PageLayout>
      <AssistantFlottant />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}