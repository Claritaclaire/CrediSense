import { useState, useEffect } from "react";import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

export default function AdminUserManagement() {
  const { user } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [modificationEnCours, setModificationEnCours] = useState(new Set());

  useEffect(() => {
    chargerUtilisateurs();
  }, []);

  const chargerUtilisateurs = async () => {
    setChargement(true);
    setErreur("");
    try {
      const { data } = await client.get("/users/");
      setUtilisateurs(data);
    } catch (err) {
      setErreur(
        err.response?.data?.detail || "Impossible de charger la liste des utilisateurs."
      );
      console.error("Erreur lors de la récupération des utilisateurs:", err);
    } finally {
      setChargement(false);
    }
  };

  const gererChangementRole = async (userId, nouveauRole) => {
    setModificationEnCours((prev) => new Set([...prev, userId]));
    try {
      await client.patch(`/users/${userId}/role`, { role: nouveauRole });
      // Mettre à jour l'état local pour une réponse immédiate
      setUtilisateurs((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: nouveauRole } : u
        )
      );
    } catch (err) {
      setErreur(
        err.response?.data?.detail ||
          `Impossible de modifier le rôle de l'utilisateur.`
      );
      console.error("Erreur lors de la modification du rôle:", err);
    } finally {
      setModificationEnCours((prev) => new Set([...prev].filter((id) => id !== userId)));
    }
  };

  const roles = [
    { value: "client", label: "Client" },
    { value: "conseiller", label: "Conseiller" },
    { value: "admin", label: "Administrateur" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display mb-4">Gestion des utilisateurs</h1>
        <p className="text-ardoise">
          Bienvenue, {user?.nom}. Cette page vous permet de gérer les comptes utilisateurs et leurs rôles.
        </p>
      </div>

      {erreur && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {erreur}
        </div>
      )}

      {chargement ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-or"></div>
          <p className="mt-2 text-ardoise">Chargement des utilisateurs...</p>
        </div>
      ) : utilisateurs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-ardoise">Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ardoise/20">
            <thead className="divide-y">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ardoise uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ardoise uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ardoise uppercase tracking-wider">
                  Rôle actuel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ardoise uppercase tracking-wider">
                  Modifier le rôle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise/20">
              {utilisateurs.map((utilisateur) => (
                <tr key={utilisateur.id} className="hover:bg-ardoise/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo">
                    {utilisateur.nom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ardoise">
                    {utilisateur.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        utilisateur.role === "client"
                          ? "bg-vert/20 text-vert"
                          : utilisateur.role === "conseiller"
                          ? "bg-or/20 text-or"
                          : "bg-indigo/20 text-indigo"
                      }`}
                    >
                      {utilisateur.role === "client" ? "Client" : utilisateur.role === "conseiller" ? "Conseiller" : "Administrateur"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {modificationEnCours.has(utilisateur.id) ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-or"></div>
                        <span className="text-ardoise">Mise à jour...</span>
                      </div>
                    ) : (
                      <select
                        value={utilisateur.role}
                        onChange={(e) => gererChangementRole(utilisateur.id, e.target.value)}
                        className="border border-ardoise/30 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-or/20"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 text-center text-ardoise text-sm">
        <p>
          Seuls les administrateurs peuvent accéder à cette page. Connectez-vous avec un compte administrateur pour gérer les utilisateurs et leurs rôles.
        </p>
      </div>
    </div>
  );
}
