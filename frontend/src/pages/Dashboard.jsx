import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Users, UserCheck, UserX, Clock, FileText, Palmtree,
    Calendar as CalendarIcon, ArrowRight, Sparkles,
    X, ChevronRight
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import "./Dashboard.css";

const STAT_TILES = [
    { key: "total_staff",        label: "Total Staff",          accent: "var(--c-blush)",  Icon: Users,     iconBg: "#FDECEF", iconColor: "#8B1C31", detailStatus: "all" },
    { key: "present_today",      label: "Present Today",        accent: "#2E7D32",         Icon: UserCheck, iconBg: "#E6F4EA", iconColor: "#2E7D32", detailStatus: "present" },
    { key: "absent_today",       label: "Absent Today",         accent: "#C62828",         Icon: UserX,     iconBg: "#FDECEF", iconColor: "#C62828", detailStatus: "absent" },
    { key: "leave_today",        label: "On Leave Today",       accent: "#F57F17",         Icon: Clock,     iconBg: "#FFF4E5", iconColor: "#B26A00", detailStatus: "leave" },
    { key: "pending_leaves",     label: "Pending Leave Requests", accent: "#E64A19",       Icon: FileText,  iconBg: "#FFEBE5", iconColor: "#D84315" },
    { key: "upcoming_holidays",  label: "Upcoming Holidays",    accent: "#1565C0",         Icon: Palmtree,  iconBg: "#E3F2FD", iconColor: "#1565C0" },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [selectedTile, setSelectedTile] = useState(null);
    const [staffDetails, setStaffDetails] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [detailsDate, setDetailsDate] = useState("");

    useEffect(() => {
        api.get("/api/dashboard/stats")
            .then((res) => setStats(res.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    }, []);

const openStaffDetails = (tile) => {
    if (!tile.detailStatus || user?.role !== "admin") {
        return;
    }

    setStaffDetails([]);
    setDetailsError("");
    setDetailsDate("");
    setDetailsLoading(true);
    setSelectedTile(tile);
};

const closeStaffDetails = () => {
    setSelectedTile(null);
};

useEffect(() => {
    if (!selectedTile) return;

    const controller = new AbortController();

    const fetchStaffDetails = async () => {
        try {
            const res = await api.get(
                "/api/dashboard/attendance-details",
                {
                    params: {
                        status: selectedTile.detailStatus
                    },
                    signal: controller.signal
                }
            );

            if (!controller.signal.aborted) {
                setStaffDetails(res.data.staff || []);
                setDetailsDate(res.data.date || "");
            }
        } catch (e) {
            if (!controller.signal.aborted) {
                setDetailsError(formatApiError(e));
            }
        } finally {
            if (!controller.signal.aborted) {
                setDetailsLoading(false);
            }
        }
    };

    fetchStaffDetails();

    return () => controller.abort();
}, [selectedTile]);


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

        const isClickable =
            Boolean(tile.detailStatus) &&
            user?.role === "admin";

        const CardTag = isClickable ? "button" : "div";

        return (
            <CardTag
                key={tile.key}
                type={isClickable ? "button" : undefined}
                className={`dash-card ${
                    isClickable ? "dash-card-clickable" : ""
                }`}
                style={{ borderLeftColor: tile.accent }}
                data-testid={`dashboard-stat-${tile.key}`}
                onClick={
                    isClickable
                        ? () => openStaffDetails(tile)
                        : undefined
                }
                aria-haspopup={
                    isClickable ? "dialog" : undefined
                }
            >
                <span className="dash-card-body">
                    <span className="dash-card-label">
                        {tile.label}
                    </span>

                    <span
                        className="dash-card-value"
                        data-testid={`stat-value-${tile.key}`}
                    >
                        {loading ? "—" : stats ? value : "—"}
                    </span>

                    {isClickable && (
                        <span className="dash-card-link">
                            View details
                            <ChevronRight size={14} />
                        </span>
                    )}
                </span>

                <span
                    className="dash-card-icon"
                    style={{
                        background: tile.iconBg,
                        color: tile.iconColor
                    }}
                >
                    <tile.Icon
                        size={26}
                        strokeWidth={2.4}
                    />
                </span>
            </CardTag>
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

{selectedTile && (
    <dialog
        className="dash-details-modal"
        aria-labelledby="dash-details-title"
        ref={(node) => {
            if (node && !node.open) {
                node.showModal();
            }
        }}
        onCancel={(e) => {
            e.preventDefault();
            closeStaffDetails();
        }}
    >
        {/* Popup header */}
        <div className="dash-details-header">
            <div>
                <p className="dash-details-eyebrow">
                    ATTENDANCE DETAILS
                </p>

                <h2
                    id="dash-details-title"
                    className="font-brand"
                >
                    {selectedTile.label}
                </h2>

                {detailsDate && (
                    <p className="dash-details-date">
                        Date: {detailsDate}
                    </p>
                )}
            </div>

            <button
                type="button"
                className="dash-details-close"
                onClick={closeStaffDetails}
                aria-label="Close attendance details"
            >
                <X size={22} />
            </button>
        </div>

        {/* Popup content */}
        <div className="dash-details-content">
            {detailsLoading ? (
                <div className="dash-details-message">
                    Loading staff details...
                </div>
            ) : detailsError ? (
                <div className="dash-details-error" role="alert">
                    {detailsError}
                </div>
            ) : staffDetails.length === 0 ? (
                <div className="dash-details-message">
                    <Users size={36} />
                    <h3>No staff records found</h3>
                    <p>
                        There are no staff members in this
                        category for the selected date.
                    </p>
                </div>
            ) : (
                <>
                    <p className="dash-details-count">
                        Total: {staffDetails.length} staff
                    </p>

                    <div className="dash-details-table-wrap">
                        <table className="dash-details-table">
                            <thead>
                                <tr>
                                    <th>Agent ID</th>
                                    <th>Staff Name</th>
                                    <th>Position</th>
                                    <th>Shift</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {staffDetails.map((staff) => (
                                    <tr key={staff.agent_id}>
                                        <td>
                                            {staff.agent_id}
                                        </td>

                                        <td>
                                            <strong>
                                                {staff.display_name ||
                                                    staff.fullname}
                                            </strong>
                                        </td>

                                        <td>
                                            {staff.position || "—"}
                                        </td>

                                        <td>
                                            {staff.shift || "—"}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    `dash-detail-status ` +
                                                    `dash-detail-status-${staff.status}`
                                                }
                                            >
                                                {{
                                                    present: "Present",
                                                    absent: "Absent",
                                                    leave: "On Leave",
                                                    standby: "Standby",
                                                    off: "Off",
                                                    unrecorded: "Unrecorded"
                                                }[staff.status] ||
                                                    staff.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>

        {/* Popup footer */}
        <div className="dash-details-footer">
            <button
                type="button"
                className="dash-details-close-btn"
                onClick={closeStaffDetails}
            >
                Close
            </button>
        </div>
    </dialog>
)}

        </div>
    );
}
