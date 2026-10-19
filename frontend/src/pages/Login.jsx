import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import "./Auth.css";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card" data-testid="login-card">
                <Link to="/" className="auth-brand">
                    <span className="font-brand text-primary text-3xl font-bold tracking-wide">DAILY TRACKER</span>
                </Link>
                <h2 className="auth-title font-brand">Welcome back</h2>
                <p className="auth-subtitle">Sign in to manage schedules and attendance.</p>

                <form onSubmit={onSubmit} className="auth-form" data-testid="login-form">
                    <label className="auth-label">
                        Email
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="auth-input"
                            data-testid="login-email"
                        />
                    </label>
                    <label className="auth-label">
                        Password
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="auth-input"
                            data-testid="login-password"
                        />
                    </label>
                    {error && <p className="auth-error" data-testid="login-error">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading} data-testid="login-submit">
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account? <Link to="/signup" data-testid="login-go-signup">Create one</Link>
                </p>

                <div className="auth-hint" data-testid="login-demo-hint">
                    <strong>Demo admin:</strong> admin@dailytracker.com / Admin@123
                </div>
            </div>
        </div>
    );
}
