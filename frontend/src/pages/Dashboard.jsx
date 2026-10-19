import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Users, UserCheck, UserX, Clock, FileText, Palmtree,
    Calendar as CalendarIcon, ArrowRight, Sparkles
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import "./Dashboard.css";

const STAT_TILES = [
    { key: "total_staff",        label: "Total Staff",          accent: "var(--c-blush)",  Icon: Users,     iconBg: "#FDECEF", iconColor: "#8B1C31" },
    { key: "present_today",      label: "Present Today",        accent: "#2E7D32",         Icon: UserCheck, iconBg: "#E6F4EA", iconColor: "#2E7D32" },
    { key: "absent_today",       label: "Absent Today",         accent: "#C62828",         Icon: UserX,     iconBg: "#FDECEF", iconColor: "#C62828" },
    { key: "leave_today",        label: "On Leave Today",       accent: "#F57F17",         Icon: Clock,     iconBg: "#FFF4E5", iconColor: "#B26A00" },
    { key: "pending_leaves",     label: "Pending Leave Requests", accent: "#E64A19",       Icon: FileText,  iconBg: "#FFEBE5", iconColor: "#D84315" },
    { key: "upcoming_holidays",  label: "Upcoming Holidays",    accent: "#1565C0",         Icon: Palmtree,  iconBg: "#E3F2FD", iconColor: "#1565C0" },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/api/dashboard/stats")
            .then((res) => setStats(res.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    }, []);

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    })();

    return (
        <div className="dash-page" data-testid="dashboard-page">
            <div className="dash-hero">
                <div>
                    <p className="dash-eyebrow">DASHBOARD</p>
                    <h1 className="dash-title font-brand">{greeting}, {user?.name?.split(" ")[0] || "there"}.</h1>
                    <p className="dash-sub">Here's your workforce overview for today.</p>
                </div>
                {stats?.today_holiday && (
                    <div className="dash-today-pill" data-testid="dashboard-today-holiday">
                        <Palmtree size={16} />
                        Today is <strong>{stats.today_holiday}</strong>
                    </div>
                )}
            </div>

            <div className="dash-grid">
                {STAT_TILES.map((tile) => {
                    const value = stats?.[tile.key] ?? 0;
                    return (
                        <div
                            key={tile.key}
                            className="dash-card"
                            style={{ borderLeftColor: tile.accent }}
                            data-testid={`dashboard-stat-${tile.key}`}
                        >
                            <div className="dash-card-body">
                                <p className="dash-card-label">{tile.label}</p>
                                <p className="dash-card-value" data-testid={`stat-value-${tile.key}`}>
                                    {loading ? "—" : value}
                                </p>
                            </div>
                            <div className="dash-card-icon" style={{ background: tile.iconBg, color: tile.iconColor }}>
                                <tile.Icon size={26} strokeWidth={2.4} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="dash-quick">
                <div className="dash-quick-head">
                    <Sparkles size={18} className="dash-quick-spark" />
                    <h2 className="font-brand">Quick Actions</h2>
                </div>
                <div className="dash-quick-grid">
                    <Link to="/dashboard/calendar" className="dash-quick-btn" data-testid="quick-view-calendar">
                        <CalendarIcon size={18} /> View Calendar <ArrowRight size={16} className="dash-quick-arrow" />
                    </Link>
                    <Link to="/dashboard/staffs" className="dash-quick-btn" data-testid="quick-manage-staff">
                        <Users size={18} /> Manage Staff <ArrowRight size={16} className="dash-quick-arrow" />
                    </Link>
                    <Link to="/dashboard/reports" className="dash-quick-btn" data-testid="quick-view-reports">
                        <FileText size={18} /> View Reports <ArrowRight size={16} className="dash-quick-arrow" />
                    </Link>
                </div>
            </div>

            {stats?.recent_attendance?.length > 0 && (
                <div className="dash-recent">
                    <h2 className="font-brand dash-recent-title">Recent Attendance Updates</h2>
                    <div className="dash-recent-list">
                        {stats.recent_attendance.map((r) => (
                            <div key={r.id} className="dash-recent-row" data-testid={`recent-${r.id}`}>
                                <span className={`dash-status-dot dash-status-${r.status}`} />
                                <div className="dash-recent-meta">
                                    <strong>{r.display_name}</strong> <span className="dash-recent-agent">({r.agent_id})</span>
                                </div>
                                <span className={`dash-recent-status dash-recent-status-${r.status}`}>{r.status}</span>
                                <span className="dash-recent-date">{r.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
