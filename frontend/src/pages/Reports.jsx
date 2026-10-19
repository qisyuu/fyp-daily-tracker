import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart, Brain, AlertTriangle, Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import "./Reports.css";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function ReportsPage() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [tab, setTab] = useState("monthly");
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const years = useMemo(() => {
        const cy = today.getFullYear();
        return [cy - 2, cy - 1, cy, cy + 1];
    // eslint-disable-next-line
    }, []);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/reports/monthly?year=${year}&month=${month}`)
            .then((res) => setReport(res.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    }, [year, month]);

    const exportCSV = () => {
        if (!report?.rows?.length) {
            toast.error("Nothing to export");
            return;
        }
        const header = ["Month", "Agent ID", "Display Name", "Fullname", "Position", "Shift", "Normal", "Sat", "Sun", "PH OT", "MC", "Leaves", "Absent"];
        const lines = [header.join(",")];
        for (const r of report.rows) {
            lines.push([
                r.month, r.agent_id,
                JSON.stringify(r.display_name || ""),
                JSON.stringify(r.fullname || ""),
                JSON.stringify(r.position || ""),
                JSON.stringify(r.shift || ""),
                r.normal, r.sat, r.sun, r.ph_ot, r.mc, r.leaves, r.absent,
            ].join(","));
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance_${report.month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded");
    };

    return (
        <div className="rep-page" data-testid="reports-page">
            <div className="rep-hero">
                <div className="rep-hero-text">
                    <p className="rep-eyebrow">REPORTS & ANALYTICS</p>
                    <h1 className="rep-title font-brand">Attendance Reports</h1>
                    <p className="rep-sub">Generate detailed attendance reports from data tracked on the calendar.</p>
                </div>
            </div>

            <div className="rep-controls" data-testid="reports-controls">
                <div className="rep-control-grp">
                    <label className="rep-label">
                        Month
                        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="rep-select" data-testid="reports-month">
                            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                    </label>
                    <label className="rep-label">
                        Year
                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                            className="rep-select" data-testid="reports-year">
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </label>
                </div>
                <div className="rep-actions">
                    <button onClick={exportCSV} className="rep-export-btn" data-testid="reports-export-csv">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="rep-tabs" role="tablist">
                <button role="tab"
                    className={`rep-tab ${tab === "monthly" ? "rep-tab-active" : ""}`}
                    onClick={() => setTab("monthly")}
                    data-testid="reports-tab-monthly">
                    <FileBarChart size={16} /> Monthly Report
                </button>
                <button role="tab"
                    className={`rep-tab ${tab === "ai" ? "rep-tab-active" : ""}`}
                    onClick={() => setTab("ai")}
                    data-testid="reports-tab-ai">
                    <Brain size={16} /> AI Summary <span className="rep-soon">soon</span>
                </button>
                <button role="tab"
                    className={`rep-tab ${tab === "anomaly" ? "rep-tab-active" : ""}`}
                    onClick={() => setTab("anomaly")}
                    data-testid="reports-tab-anomaly">
                    <AlertTriangle size={16} /> Anomaly Detection <span className="rep-soon">soon</span>
                </button>
            </div>

            {tab === "monthly" && (
                <div className="rep-card" data-testid="reports-monthly-card">
                    <div className="rep-meta-bar">
                        <p>
                            <strong>{report ? `${MONTH_NAMES[month - 1]} ${year}` : "—"}</strong>
                            {report && <span> · {report.total_working_days} days in month · {report.rows.length} active staff</span>}
                        </p>
                    </div>
                    {loading ? (
                        <div className="rep-loader"><Loader2 className="animate-spin" size={20} /> Loading report…</div>
                    ) : (
                        <div className="rep-table-wrap">
                            <table className="rep-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Agent ID</th>
                                        <th>Employee Name</th>
                                        <th>Shift</th>
                                        <th title="Present on weekdays (excluding holidays)">Normal</th>
                                        <th title="Present on Saturday">Sat</th>
                                        <th title="Present on Sunday">Sun</th>
                                        <th title="Present on Public Holiday">PH OT</th>
                                        <th title="Leave (Medical Cert)">MC</th>
                                        <th>Leaves</th>
                                        <th>Absent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!report?.rows || report.rows.length === 0) && (
                                        <tr><td colSpan={11} className="rep-empty">No data for this month.</td></tr>
                                    )}
                                    {report?.rows?.map((r) => (
                                        <tr key={r.agent_id} data-testid={`reports-row-${r.agent_id}`}>
                                            <td className="rep-mono">{r.month}</td>
                                            <td className="rep-mono"><strong>{r.agent_id}</strong></td>
                                            <td>
                                                <div className="rep-name">{r.fullname || r.display_name}</div>
                                                <div className="rep-name-meta">{r.position}</div>
                                            </td>
                                            <td><span className="rep-pill">{r.shift}</span></td>
                                            <td className="rep-num">{r.normal}</td>
                                            <td className="rep-num">{r.sat}</td>
                                            <td className="rep-num">{r.sun}</td>
                                            <td className="rep-num">{r.ph_ot}</td>
                                            <td className="rep-num">{r.mc}</td>
                                            <td className="rep-num">{r.leaves}</td>
                                            <td className="rep-num rep-num-absent">{r.absent}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === "ai" && (
                <div className="rep-card rep-placeholder" data-testid="reports-ai-placeholder">
                    <Brain size={36} />
                    <h3 className="font-brand">AI Attendance Summary</h3>
                    <p>Coming in Phase 2 — LLM-generated narrative summary of monthly attendance using Gemini Flash via the Emergent Universal Key.</p>
                </div>
            )}

            {tab === "anomaly" && (
                <div className="rep-card rep-placeholder" data-testid="reports-anomaly-placeholder">
                    <AlertTriangle size={36} />
                    <h3 className="font-brand">Anomaly Detection</h3>
                    <p>Coming in Phase 2 — scikit-learn Isolation Forest to flag unusual absence patterns and MC spikes.</p>
                </div>
            )}
        </div>
    );
}
