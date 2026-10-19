import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import "./Auth.css";

const PW_RULES = [
    { key: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
    { key: "upper", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
    { key: "num", label: "A number (0–9)", test: (p) => /[0-9]/.test(p) },
    { key: "special", label: "A special character (!@#$…)", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p) },
];

export default function Signup() {
    const { setUser } = useAuth();
    const navigate = useNavigate();

    // Step 1: verify staff id. Step 2: complete account.
    const [step, setStep] = useState(1);
    const [agentId, setAgentId] = useState("");
    const [staffInfo, setStaffInfo] = useState(null); // { display_name, fullname, position }

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const verifyStaffId = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/check-staff-id", { agent_id: agentId.trim() });
            if (!data.valid) {
                setError(data.reason || "Invalid Staff ID");
                setStaffInfo(null);
            } else {
                setStaffInfo(data);
                setStep(2);
            }
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const completeSignup = async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        const allRulesPass = PW_RULES.every((r) => r.test(password));
        if (!allRulesPass) {
            setError("Password does not meet the security requirements.");
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post("/api/auth/register", {
                agent_id: staffInfo.agent_id,
                email: email.trim(),
                password,
            });
            localStorage.setItem("dt_token", data.token);
            localStorage.setItem("dt_user", JSON.stringify(data.user));
            setUser(data.user);
            navigate("/dashboard");
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card" data-testid="signup-card">
                <Link to="/" className="auth-brand">
                    <span className="font-brand text-primary text-3xl font-bold tracking-wide">DAILY TRACKER</span>
                </Link>

                <div className="signup-stepper" data-testid="signup-stepper">
                    <div className={`signup-step ${step >= 1 ? "signup-step-active" : ""}`}>
                        <span className="signup-step-num">{step > 1 ? <CheckCircle2 size={16} /> : "1"}</span>
                        <span>Verify Staff ID</span>
                    </div>
                    <div className="signup-step-line" />
                    <div className={`signup-step ${step >= 2 ? "signup-step-active" : ""}`}>
                        <span className="signup-step-num">2</span>
                        <span>Account Details</span>
                    </div>
                </div>

                {step === 1 && (
                    <>
                        <h2 className="auth-title font-brand">Verify your Staff ID</h2>
                        <p className="auth-subtitle">
                            Your admin needs to register your Staff ID before you can create an account.
                        </p>

                        <form onSubmit={verifyStaffId} className="auth-form" data-testid="signup-step1-form">
                            <label className="auth-label">
                                Staff / Agent ID
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={agentId}
                                    onChange={(e) => setAgentId(e.target.value.toUpperCase())}
                                    placeholder="e.g. A001"
                                    className="auth-input"
                                    data-testid="signup-agent-id"
                                />
                            </label>
                            {error && <p className="auth-error" data-testid="signup-error">{error}</p>}
                            <button type="submit" className="auth-submit" disabled={loading} data-testid="signup-verify-btn">
                                {loading ? "Checking…" : (<>Continue <ArrowRight size={16} style={{ marginLeft: 6 }} /></>)}
                            </button>
                        </form>

                        <p className="auth-switch">
                            Already have an account? <Link to="/login" data-testid="signup-go-login">Log in</Link>
                        </p>

                        <div className="auth-hint">
                            <strong>Tip:</strong> Try Staff ID <code>A002</code> or <code>A003</code> with the demo data.
                        </div>
                    </>
                )}

                {step === 2 && staffInfo && (
                    <>
                        <h2 className="auth-title font-brand">Set up your account</h2>
                        <p className="auth-subtitle">Almost there — choose how you'll sign in.</p>

                        <div className="signup-staff-card" data-testid="signup-staff-preview">
                            <ShieldCheck size={22} className="signup-staff-icon" />
                            <div>
                                <p className="signup-staff-name" data-testid="signup-staff-name">
                                    {staffInfo.fullname}
                                </p>
                                <p className="signup-staff-meta">
                                    <strong>{staffInfo.agent_id}</strong> · {staffInfo.position}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={completeSignup} className="auth-form" data-testid="signup-step2-form">
                            <label className="auth-label">
                                Work Email
                                <input
                                    type="email"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="auth-input"
                                    data-testid="signup-email"
                                />
                            </label>
                            <label className="auth-label">
                                Password
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 8 chars, with uppercase, number, special"
                                    className="auth-input"
                                    data-testid="signup-password"
                                />
                            </label>
                            {password.length > 0 && (
                                <ul className="pw-rules" data-testid="signup-pw-rules">
                                    {PW_RULES.map((r) => {
                                        const ok = r.test(password);
                                        return (
                                            <li key={r.key} className={ok ? "pw-rule-ok" : "pw-rule-bad"}
                                                data-testid={`pw-rule-${r.key}-${ok ? "ok" : "bad"}`}>
                                                {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                {r.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <label className="auth-label">
                                Confirm Password
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="auth-input"
                                    data-testid="signup-confirm-password"
                                />
                            </label>
                            {error && <p className="auth-error" data-testid="signup-error-2">{error}</p>}
                            <div className="signup-step2-actions">
                                <button
                                    type="button"
                                    className="signup-back-btn"
                                    onClick={() => { setStep(1); setError(""); }}
                                    data-testid="signup-back-btn"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <button type="submit" className="auth-submit signup-submit" disabled={loading}
                                    data-testid="signup-submit">
                                    {loading ? "Creating…" : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
