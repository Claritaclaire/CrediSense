import { createContext, useContext, useState, useEffect, useCallback } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

// Helper to decode JWT payload (without verification - just to extract claims)
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Initialiser le header axios avec le token s'il existe déjà
const initialToken = localStorage.getItem("access_token");
if (initialToken) {
  client.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronisation du profil au démarrage ou lors des changements de jeton
  useEffect(() => {
    let isMounted = true;

    if (!token) {
      delete client.defaults.headers.common["Authorization"];
      setUser(null);
      setLoading(false);
      return;
    }

    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const fetchUserProfile = async () => {
      try {
        const { data } = await client.get("/users/me");
        if (isMounted) {
          setUser(data);
          console.log('[AuthContext] User loaded:', data);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("[AuthContext] Failed to load user profile:", err);
          setUser(null);
          localStorage.removeItem("access_token");
          delete client.defaults.headers.common["Authorization"];
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Finalise une connexion une fois un vrai access_token obtenu (avec ou sans
  // etape 2FA prealable) : stocke le token, recupere le profil, met a jour l'etat.
  const finaliserConnexion = useCallback(async (accessToken) => {
    localStorage.setItem("access_token", accessToken);
    client.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    const { data: userData } = await client.get("/users/me");
    setUser(userData);
    setToken(accessToken);
    setLoading(false);
    return userData;
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { data } = await client.post("/auth/login", { email, password });

      if (data.requires_2fa) {
        // Mot de passe correct, mais un code a 6 chiffres est encore requis :
        // on ne connecte pas encore l'utilisateur.
        setLoading(false);
        return { requires2FA: true, tempToken: data.temp_token };
      }

      const userData = await finaliserConnexion(data.access_token);
      return { requires2FA: false, user: userData };
    } catch (error) {
      setLoading(false);
      console.error('[AuthContext.login] Login error:', error);
      throw error;
    }
  }, [finaliserConnexion]);

  const completerConnexion2FA = useCallback(async (tempToken, code) => {
    try {
      setLoading(true);
      const { data } = await client.post("/auth/login/2fa", { temp_token: tempToken, code });
      const userData = await finaliserConnexion(data.access_token);
      return userData;
    } catch (error) {
      setLoading(false);
      console.error('[AuthContext.completerConnexion2FA] Error:', error);
      throw error;
    }
  }, [finaliserConnexion]);

  const register = useCallback(async (nom, email, password, telephone) => {
    try {
      await client.post("/auth/register", { nom, email, password, telephone: telephone || null });
      // Après inscription, on connecte directement l'utilisateur
      await login(email, password);
    } catch (error) {
      console.error('[AuthContext.register] Register error:', error);
      throw error;
    }
  }, [client, login]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    delete client.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setLoading(false);
  }, [setToken, setUser]);

  const estConnecte = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, user, setUser, loading, estConnecte, login, completerConnexion2FA, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}