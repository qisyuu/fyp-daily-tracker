import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Palmtree } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import "./Holidays.css";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const EMPTY = { date: "", region: "National", occasion: "", details: "" };

export default function HolidaysPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [year, setYear] = useState(new Date().getFullYear());
    const [list, setList] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const years = useMemo(() => {
        const cy = new Date().getFullYear();
        return [cy - 1, cy, cy + 1, cy + 2];
    }, []);

    const load = async () => {
        try {
            const { data } = await api.get(`/api/holidays?year=${year}`);
            setList(data);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

    // Group holidays by month
    const grouped = useMemo(() => {
        const m = {};
        list.forEach((h) => {
            const monthIdx = parseInt(h.date.slice(5, 7), 10) - 1;
            if (!m[monthIdx]) m[monthIdx] = [];
            m[monthIdx].push(h);
        });
        return m;
    }, [list]);

    const monthsWithData = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY, date: `${year}-01-01` });
        setOpen(true);
    };
    const openEdit = (h) => {
        setEditing(h);
        setForm({ date: h.date, region: h.region, occasion: h.occasion, details: h.details });
        setOpen(true);
    };
    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/holidays/${editing.id}`, form);
                toast.success("Holiday updated");
            } else {
                await api.post("/api/holidays", form);
                toast.success("Holiday added");
            }
            setOpen(false);
            await load();
        } catch (err) { toast.error(formatApiError(err)); }
        finally { setSaving(false); }
    };

    const onDelete = async (h) => {
        if (!window.confirm(`Delete holiday "${h.occasion}"?`)) return;
        try {
            await api.delete(`/api/holidays/${h.id}`);
            toast.success("Holiday deleted");
            await load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const formatDay = (iso) => {
        const d = new Date(iso + "T00:00:00");
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };

    return (
        <div className="hol-page">
            <div className="hol-header">
                <div>
                    <p className="hol-eyebrow">HOLIDAYS</p>
                    <h1 className="hol-title font-brand">Holidays</h1>
                    <p className="hol-sub">Manage public and company holidays</p>
                </div>
                <div className="hol-header-actions">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="hol-year-select"
                        data-testid="holiday-year-select"
                    >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {isAdmin && (
                        <button className="hol-add-btn" onClick={openCreate} data-testid="holiday-add-btn">
                            <Plus size={16} /> Add Holiday
                        </button>
                    )}
                </div>
            </div>

            <div className="hol-summary" data-testid="holiday-summary">
                <div className="hol-summary-icon">
                    <Palmtree size={28} />
                </div>
                <div>
                    <p className="hol-summary-num">{list.length}</p>
                    <p className="hol-summary-label">Total Holidays in {year}</p>
                </div>
            </div>

            {list.length === 0 ? (
                <div className="hol-empty-state">
                    <Palmtree size={36} />
                    <p>No holidays registered for {year}.</p>
                    {isAdmin && <p className="hol-empty-sub">Click "Add Holiday" to create one.</p>}
                </div>
            ) : (
                <div className="hol-month-grid" data-testid="holiday-month-grid">
                    {monthsWithData.map((mi) => (
                        <div key={mi} className="hol-month-col" data-testid={`holiday-month-${mi}`}>
                            <div className="hol-month-head">
                                <h3>{MONTH_NAMES[mi]}</h3>
                                <span className="hol-month-count">{grouped[mi].length}</span>
                            </div>
                            <div className="hol-month-cards">
                                {grouped[mi].map((h) => (
                                    <div key={h.id} className="hol-card" data-testid={`holiday-card-${h.id}`}>
                                        <div className="hol-card-top">
                                            <div className="hol-card-occasion">{h.occasion}</div>
                                            <span className="hol-card-pill">{h.region}</span>
                                        </div>
                                        <p className="hol-card-date">{formatDay(h.date)}</p>
                                        {h.details && <p className="hol-card-details">{h.details}</p>}
                                        {isAdmin && (
                                            <div className="hol-card-actions">
                                                <button className="hol-action hol-action-edit" onClick={() => openEdit(h)}
                                                    data-testid={`holiday-edit-${h.id}`} aria-label="Edit">
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="hol-action hol-action-delete" onClick={() => onDelete(h)}
                                                    data-testid={`holiday-delete-${h.id}`} aria-label="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="hol-modal-back" onClick={() => setOpen(false)}>
                    <div className="hol-modal" onClick={(e) => e.stopPropagation()} data-testid="holiday-modal">
                        <div className="hol-modal-head">
                            <h3 className="font-brand">{editing ? "Edit Holiday" : "Add Holiday"}</h3>
                            <button onClick={() => setOpen(false)} className="hol-modal-close"><X size={18} /></button>
                        </div>
                        <form onSubmit={onSubmit} className="hol-form">
                            <label>
                                Date
                                <input type="date" name="date" required value={form.date} onChange={onChange}
                                    data-testid="holiday-form-date" />
                            </label>
                            <label>
                                Region
                                <input name="region" required value={form.region} onChange={onChange}
                                    placeholder="National, Federal Territory…" data-testid="holiday-form-region" />
                            </label>
                            <label>
                                Occasion
                                <input name="occasion" required value={form.occasion} onChange={onChange}
                                    placeholder="e.g. Merdeka Day" data-testid="holiday-form-occasion" />
                            </label>
                            <label>
                                Details
                                <textarea name="details" rows={3} value={form.details} onChange={onChange}
                                    placeholder="Optional notes" data-testid="holiday-form-details" />
                            </label>
                            <div className="hol-form-actions">
                                <button type="button" className="hol-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                                <button type="submit" className="hol-btn-primary" disabled={saving} data-testid="holiday-form-submit">
                                    {saving ? "Saving…" : (editing ? "Save changes" : "Add Holiday")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
