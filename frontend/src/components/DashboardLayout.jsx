import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, CalendarDays, FileBarChart, History as HistoryIcon, LogOut, Bell, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "./DashboardLayout.css";

const NAV_ITEMS = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard", end: true },
    { to: "/dashboard/calendar", label: "Calendar", icon: Calendar, testid: "sidebar-nav-calendar" },
    { to: "/dashboard/staffs", label: "Staffs", icon: Users, testid: "sidebar-nav-staffs" },
    { to: "/dashboard/holidays", label: "Holidays", icon: CalendarDays, testid: "sidebar-nav-holidays" },
    { to: "/dashboard/reports", label: "Reports", icon: FileBarChart, testid: "sidebar-nav-reports" },
    { to: "/dashboard/history", label: "History", icon: HistoryIcon, testid: "sidebar-nav-history", disabled: true },
];

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(true);

    const initials = user?.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "U";

    return (
        <div className="dt-shell">
            <aside className={`dt-sidebar ${open ? "" : "dt-sidebar-closed"}`} data-testid="dashboard-sidebar">
                <div className="dt-sidebar-brand">
                    <span className="font-brand text-primary text-2xl tracking-wide">DT</span>
                </div>
                <nav className="dt-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            data-testid={item.testid}
                            onClick={(e) => item.disabled && e.preventDefault()}
                            className={({ isActive }) =>
                                `dt-nav-link ${isActive ? "dt-nav-link-active" : ""} ${item.disabled ? "dt-nav-link-disabled" : ""}`
                            }
                        >
                            <item.icon size={18} strokeWidth={2} />
                            <span>{item.label}</span>
                            {item.disabled && <span className="dt-soon">soon</span>}
                        </NavLink>
                    ))}
                </nav>
                <button
                    onClick={() => { logout(); navigate("/login"); }}
                    className="dt-logout"
                    data-testid="sidebar-logout-button"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </aside>

            <div className="dt-main">
                <header className="dt-header" data-testid="dashboard-header">
                    <button
                        className="dt-menu-btn"
                        onClick={() => setOpen(!open)}
                        aria-label="Toggle menu"
                        data-testid="sidebar-toggle"
                    >
                        <Menu size={20} />
                    </button>
                    <h1 className="font-brand text-2xl md:text-3xl text-primary font-semibold tracking-wide">
                        DAILY TRACKER
                    </h1>
                    <div className="dt-header-right">
                        <button className="dt-icon-btn" aria-label="Notifications" data-testid="header-notifications">
                            <Bell size={18} />
                        </button>
                        <div className="dt-avatar" data-testid="header-avatar" title={user?.email}>
                            {initials}
                        </div>
                        <div className="dt-user-meta">
                            <p className="dt-user-name" data-testid="header-username">{user?.name}</p>
                            <p className="dt-user-role">{user?.role}</p>
                        </div>
                    </div>
                </header>

                <main className="dt-content animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
