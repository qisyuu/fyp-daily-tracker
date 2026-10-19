import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import "./Calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const STATUS_OPTIONS = [
    { value: "present", label: "Present", color: "#2E7D32" },
    { value: "absent",  label: "Absent",  color: "#C62828" },
    { value: "leave",   label: "Leave",   color: "#F57F17" },
    { value: "standby", label: "Standby", color: "#0277BD" },
    { value: "off",     label: "Off Day", color: "#9A8B8D" },
];

function fmtDate(year, month, day) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
}

export default function CalendarPage() {
    const { user } = useAuth();
    const [cursor, setCursor] = useState(() => new Date());
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState({}); // { 'YYYY-MM-DD': [ {agent_id, status, ...} ] }
    const [holidays, setHolidays] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null); // { date }

    // Modal form state
    const [pickedAgent, setPickedAgent] = useState("");
    const [pickedStatus, setPickedStatus] = useState("present");
    const [submitting, setSubmitting] = useState(false);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = useMemo(() => {
        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [firstDay, daysInMonth]);

    const canEdit = user?.role === "admin" || user?.role === "user";

    const loadStaff = async () => {
        try {
            const res = await api.get("/api/staff?status=active");
            setStaff(res.data);
            if (res.data.length && !pickedAgent) setPickedAgent(res.data[0].agent_id);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/attendance?month=${monthKey}`);
            const map = {};
            res.data.forEach((r) => {
                if (!map[r.date]) map[r.date] = [];
                map[r.date].push(r);
            });
            setAttendance(map);
        } catch (e) { toast.error(formatApiError(e)); }
        finally { setLoading(false); }
    };

    const loadHolidays = async () => {
        try {
            const res = await api.get(`/api/holidays?year=${year}`);
            const map = {};
            res.data.forEach((h) => { map[h.date] = h.occasion; });
            setHolidays(map);
        } catch (e) { /* silent */ }
    };

    useEffect(() => { loadStaff(); /* eslint-disable-next-line */ }, []);
    useEffect(() => { loadAttendance(); /* eslint-disable-next-line */ }, [monthKey]);
    useEffect(() => { loadHolidays(); /* eslint-disable-next-line */ }, [year]);

    const openCell = (dateStr) => {
        if (!canEdit) return;
        setSelectedCell({ date: dateStr });
        setPickedStatus("present");
        if (staff.length && !pickedAgent) setPickedAgent(staff[0].agent_id);
    };

    const submitAttendance = async (e) => {
        e.preventDefault();
        if (!pickedAgent) { toast.error("Please choose an agent"); return; }
        setSubmitting(true);
        try {
            await api.post("/api/attendance", {
                agent_id: pickedAgent,
                date: selectedCell.date,
                status: pickedStatus,
            });
            const agent = staff.find((s) => s.agent_id === pickedAgent);
            toast.success(`${agent?.display_name || pickedAgent} marked ${pickedStatus} on ${selectedCell.date}`);
            await loadAttendance();
            setSelectedCell(null);
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setSubmitting(false);
        }
    };

    const removeRecord = async (recordId) => {
        if (!window.confirm("Remove this attendance record?")) return;
        try {
            await api.delete(`/api/attendance/${recordId}`);
            await loadAttendance();
            toast.success("Record removed");
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const goPrev = () => setCursor(new Date(year, month - 1, 1));
    const goNext = () => setCursor(new Date(year, month + 1, 1));
    const goToday = () => setCursor(new Date());

    const today = new Date();
    const isToday = (d) =>
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    // Count of each status per day for cell badges
    const cellSummary = (dateStr) => {
        const recs = attendance[dateStr] || [];
        const counts = { present: 0, absent: 0, leave: 0, standby: 0, off: 0 };
        recs.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
        return counts;
    };

    const cellRecords = selectedCell ? (attendance[selectedCell.date] || []) : [];

    return (
        <div className="cal-page">
            <div className="cal-toolbar">
                <div className="cal-toolbar-left">
                    <button className="cal-icon-btn" onClick={goPrev} data-testid="calendar-prev"><ChevronLeft size={18} /></button>
                    <button className="cal-today-btn" onClick={goToday} data-testid="calendar-today">Today</button>
                    <button className="cal-icon-btn" onClick={goNext} data-testid="calendar-next"><ChevronRight size={18} /></button>
                    <h2 className="cal-title font-brand" data-testid="calendar-title">
                        {MONTH_NAMES[month]} {year}
                    </h2>
                </div>
                <div className="cal-toolbar-right">
                    {canEdit && <p className="cal-hint">Click any day to mark attendance</p>}
                </div>
            </div>

            <div className="cal-card" data-testid="calendar-grid">
                <div className="cal-week-row">
                    {DAYS.map((d) => <div key={d} className="cal-week-cell">{d}</div>)}
                </div>
                {loading ? (
                    <div className="cal-loader"><Loader2 className="animate-spin" size={22} /> Loading…</div>
                ) : (
                    <div className="cal-grid">
                        {cells.map((d, i) => {
                            if (d == null) return <div key={i} className="cal-cell cal-cell-empty" />;
                            const dateStr = fmtDate(year, month, d);
                            const holiday = holidays[dateStr];
                            const counts = cellSummary(dateStr);
                            const total = counts.present + counts.absent + counts.leave + counts.standby + counts.off;
                            return (
                                <div
                                    key={i}
                                    className={`cal-cell ${isToday(d) ? "cal-cell-today" : ""} ${holiday ? "cal-cell-holiday" : ""}`}
                                    onClick={() => openCell(dateStr)}
                                    data-testid={`calendar-cell-${dateStr}`}
                                >
                                    <span className="cal-day-num">{d}</span>
                                    {holiday && <span className="cal-holiday-pill" title={holiday}>{holiday}</span>}
                                    {total > 0 && (
                                        <div className="cal-dots">
                                            {counts.present > 0 && <span className="cal-dot-badge cal-dot-present">{counts.present}</span>}
                                            {counts.absent > 0 && <span className="cal-dot-badge cal-dot-absent">{counts.absent}</span>}
                                            {counts.leave > 0 && <span className="cal-dot-badge cal-dot-leave">{counts.leave}</span>}
                                            {counts.standby > 0 && <span className="cal-dot-badge cal-dot-standby">{counts.standby}</span>}
                                            {counts.off > 0 && <span className="cal-dot-badge cal-dot-off">{counts.off}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="cal-legend">
                {STATUS_OPTIONS.map((s) => (
                    <div key={s.value} className="cal-legend-item">
                        <span className="cal-dot" style={{ background: s.color }} />
                        {s.label}
                    </div>
                ))}
                <div className="cal-legend-item">
                    <span className="cal-dot" style={{ background: "hsl(var(--primary))" }} />
                    Holiday
                </div>
            </div>

            {selectedCell && (
                <div className="cal-modal-back" onClick={() => setSelectedCell(null)}>
                    <div className="cal-modal cal-modal-wide" onClick={(e) => e.stopPropagation()} data-testid="calendar-mark-modal">
                        <div className="cal-modal-head">
                            <div>
                                <h3 className="font-brand">Mark Attendance</h3>
                                <p className="cal-modal-sub">{selectedCell.date}{holidays[selectedCell.date] && <> · <strong>{holidays[selectedCell.date]}</strong></>}</p>
                            </div>
                            <button onClick={() => setSelectedCell(null)} className="cal-x-btn"><X size={18} /></button>
                        </div>

                        {/* Existing records */}
                        {cellRecords.length > 0 && (
                            <div className="cal-existing">
                                <p className="cal-existing-title">Already marked</p>
                                <div className="cal-existing-list">
                                    {cellRecords.map((r) => {
                                        const opt = STATUS_OPTIONS.find((s) => s.value === r.status);
                                        const staffRec = staff.find((s) => s.agent_id === r.agent_id);
                                        return (
                                            <div key={r.id} className="cal-existing-row" data-testid={`cell-record-${r.agent_id}`}>
                                                <strong>{r.agent_id}</strong>
                                                <span className="cal-existing-name">{staffRec?.display_name || ""}</span>
                                                <span className="cal-existing-status" style={{ background: opt?.color }}>{r.status}</span>
                                                <button onClick={() => removeRecord(r.id)} className="cal-existing-remove" aria-label="Remove"
                                                    data-testid={`cell-record-remove-${r.agent_id}`}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Add / update form */}
                        <form onSubmit={submitAttendance} className="cal-form">
                            <label>
                                Select Agent
                                <select
                                    value={pickedAgent}
                                    onChange={(e) => setPickedAgent(e.target.value)}
                                    className="cal-form-select"
                                    data-testid="cell-modal-agent"
                                >
                                    {staff.map((s) => (
                                        <option key={s.agent_id} value={s.agent_id}>
                                            {s.agent_id} — {s.display_name} ({s.position})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div>
                                <p className="cal-form-label">Status</p>
                                <div className="cal-status-grid">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            className={`cal-status-chip ${pickedStatus === opt.value ? "cal-status-chip-active" : ""}`}
                                            style={pickedStatus === opt.value ? { background: opt.color, borderColor: opt.color, color: "white" } : { borderColor: opt.color, color: opt.color }}
                                            onClick={() => setPickedStatus(opt.value)}
                                            data-testid={`cell-modal-status-${opt.value}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="cal-modal-actions">
                                <button type="button" className="cal-btn-ghost" onClick={() => setSelectedCell(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cal-btn-primary" disabled={submitting} data-testid="cell-modal-submit">
                                    {submitting ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
