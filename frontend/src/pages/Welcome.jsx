import { Link } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
    return (
        <div className="welcome-shell" data-testid="welcome-page">
            <div className="welcome-left">
                <div className="welcome-overlay" />
                <div className="welcome-hero">
                    <p className="welcome-eyebrow">WELCOME TO</p>
                    <h1 className="welcome-title font-brand">DAILY<br/>TRACKER</h1>
                    <p className="welcome-tagline">
                        An integrated resource management and workforce scheduling system —
                        designed for modern teams.
                    </p>
                    <div className="welcome-cta-row">
                        <Link to="/login" className="welcome-cta" data-testid="welcome-login-btn">
                            Login
                        </Link>
                        <Link to="/signup" className="welcome-cta-ghost" data-testid="welcome-signup-btn">
                            Create account
                        </Link>
                    </div>
                </div>
                <footer className="welcome-footer">© {new Date().getFullYear()} Daily Tracker · FYP Prototype</footer>
            </div>

            <div className="welcome-right">
                <div className="welcome-feature-card">
                    <h2 className="font-brand">Smarter Scheduling.<br/>Cleaner Attendance.</h2>
                    <ul>
                        <li>Calendar-based shift & attendance management</li>
                        <li>Staff directory with active / resigned tracking</li>
                        <li>Holiday register for the whole organization</li>
                        <li>Role-based access for Admin, Staff, and Guests</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
