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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile when token changes
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await client.get("/users/me");
        if (isMounted) {
          setUser(data);
          console.log('[AuthContext.useEffect] User fetched from /users/me:', data);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("[AuthContext.useEffect] Failed to fetch user profile:", err);
          setUser(null);
          localStorage.removeItem("access_token");
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (token) {
      fetchUserProfile();
    } else {
      setUser(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await client.post("/auth/login", { email, password });
      const accessToken = data.access_token;
      localStorage.setItem("access_token", accessToken);
      setToken(accessToken);
      console.log('[AuthContext.login] Token set in localStorage:', accessToken.substring(0, 20) + '...');
      
      try {
        const { data: userData } = await client.get("/users/me");
        setUser(userData);
        return userData;
      } catch (fetchErr) {
        console.warn('[AuthContext.login] Failed to fetch user profile during login:', fetchErr);
        const decoded = decodeJwtPayload(accessToken);
        return decoded;
      }
    } catch (error) {
      console.error('[AuthContext.login] Login error:', error);
      throw error;
    }
  }, [client, setToken]);

  const register = useCallback(async (nom, email, password) => {
    try {
      await client.post("/auth/register", { nom, email, password });
      // Après inscription, on connecte directement l'utilisateur
      await login(email, password);
    } catch (error) {
      console.error('[AuthContext.register] Register error:', error);
      throw error;
    }
  }, [client, login]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }, [setToken, setUser]);

  const estConnecte = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, user, setUser, loading, estConnecte, login, register, logout }}>
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