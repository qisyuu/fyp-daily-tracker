import { createContext, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY, USER_KEY } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // null = checking, false = not authenticated, object = authenticated
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setUser(false);
            return;
        }
        api.get("/api/auth/me")
            .then((res) => setUser(res.data))
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                setUser(false);
            });
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post("/api/auth/login", { email, password });
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const register = async (payload) => {
        // payload: { agent_id, email, password }
        const { data } = await api.post("/api/auth/register", payload);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
