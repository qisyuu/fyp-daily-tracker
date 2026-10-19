import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import "./Staffs.css";

const EMPTY_FORM = {
    agent_id: "", display_name: "", fullname: "",
    position: "Agent", shift: "Day", contact_number: "", status: "active",
};

export default function StaffsPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState("active");
    const [active, setActive] = useState([]);
    const [resigned, setResigned] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // staff obj or null
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const isAdmin = user?.role === "admin";

    const load = async () => {
        try {
            const [a, r] = await Promise.all([
                api.get("/api/staff?status=active"),
                api.get("/api/staff?status=resigned"),
            ]);
            setActive(a.data);
            setResigned(r.data);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (s) => {
        setEditing(s);
        setForm({
            agent_id: s.agent_id, display_name: s.display_name, fullname: s.fullname,
            position: s.position, shift: s.shift, contact_number: s.contact_number, status: s.status,
        });
        setModalOpen(true);
    };
    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/staff/${editing.id}`, form);
                toast.success("Staff updated");
            } else {
                await api.post("/api/staff", form);
                toast.success("Staff added");
            }
            setModalOpen(false);
            await load();
        } catch (err) { toast.error(formatApiError(err)); }
        finally { setSaving(false); }
    };

    const onDelete = async (s) => {
        if (!window.confirm(`Delete staff ${s.agent_id} (${s.display_name})?`)) return;
        try {
            await api.delete(`/api/staff/${s.id}`);
            toast.success("Staff deleted");
            await load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const rows = tab === "active" ? active : resigned;

    return (
        <div className="staff-page">
            <div className="staff-header">
                <div>
                    <h2 className="staff-title font-brand">Staffs</h2>
                    <p className="staff-sub">{active.length} active · {resigned.length} resigned</p>
                </div>
                {isAdmin && (
                    <button className="staff-add-btn" onClick={openCreate} data-testid="staff-add-btn">
                        <Plus size={16} /> Add Staff
                    </button>
                )}
            </div>

            <div className="staff-tabs" role="tablist">
                <button
                    role="tab"
                    className={`staff-tab ${tab === "active" ? "staff-tab-active" : ""}`}
                    onClick={() => setTab("active")}
                    data-testid="staff-tab-active"
                >
                    Active ({active.length})
                </button>
                <button
                    role="tab"
                    className={`staff-tab ${tab === "resigned" ? "staff-tab-active" : ""}`}
                    onClick={() => setTab("resigned")}
                    data-testid="staff-tab-resigned"
                >
                    Resigned ({resigned.length})
                </button>
            </div>

            <div className="staff-table-wrap" data-testid="staff-table">
                <table className="staff-table">
                    <thead>
                        <tr>
                            <th>Agent ID</th>
                            <th>Display Name</th>
                            <th>Fullname</th>
                            <th>Position</th>
                            <th>Shift</th>
                            <th>Contact</th>
                            {isAdmin && <th className="staff-th-actions">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={isAdmin ? 7 : 6} className="staff-empty">No staff found.</td></tr>
                        )}
                        {rows.map((s) => (
                            <tr key={s.id} data-testid={`staff-row-${s.agent_id}`}>
                                <td><strong>{s.agent_id}</strong></td>
                                <td>{s.display_name}</td>
                                <td>{s.fullname}</td>
                                <td><span className="staff-pill">{s.position}</span></td>
                                <td>{s.shift}</td>
                                <td>{s.contact_number || "—"}</td>
                                {isAdmin && (
                                    <td className="staff-td-actions">
                                        <button className="staff-action staff-action-edit" onClick={() => openEdit(s)}
                                            data-testid={`staff-edit-${s.agent_id}`}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="staff-action staff-action-delete" onClick={() => onDelete(s)}
                                            data-testid={`staff-delete-${s.agent_id}`}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="staff-modal-back" onClick={() => setModalOpen(false)}>
                    <div className="staff-modal" onClick={(e) => e.stopPropagation()} data-testid="staff-modal">
                        <div className="staff-modal-head">
                            <h3 className="font-brand">{editing ? "Edit Staff" : "Add Staff"}</h3>
                            <button onClick={() => setModalOpen(false)} className="staff-modal-close"><X size={18} /></button>
                        </div>
                        <form onSubmit={onSubmit} className="staff-form">
                            <div className="staff-form-grid">
                                <label>
                                    Agent ID
                                    <input name="agent_id" required value={form.agent_id} onChange={onChange}
                                        disabled={!!editing} data-testid="staff-form-agent-id" />
                                </label>
                                <label>
                                    Display Name
                                    <input name="display_name" required value={form.display_name} onChange={onChange}
                                        data-testid="staff-form-display-name" />
                                </label>
                                <label className="staff-form-wide">
                                    Fullname
                                    <input name="fullname" required value={form.fullname} onChange={onChange}
                                        data-testid="staff-form-fullname" />
                                </label>
                                <label>
                                    Position
                                    <input name="position" value={form.position} onChange={onChange}
                                        data-testid="staff-form-position" />
                                </label>
                                <label>
                                    Shift
                                    <select name="shift" value={form.shift} onChange={onChange} data-testid="staff-form-shift">
                                        <option value="Day">Day</option>
                                        <option value="Night">Night</option>
                                        <option value="Rotation">Rotation</option>
                                    </select>
                                </label>
                                <label>
                                    Contact Number
                                    <input name="contact_number" value={form.contact_number} onChange={onChange}
                                        data-testid="staff-form-contact" />
                                </label>
                                <label>
                                    Status
                                    <select name="status" value={form.status} onChange={onChange} data-testid="staff-form-status">
                                        <option value="active">Active</option>
                                        <option value="resigned">Resigned</option>
                                    </select>
                                </label>
                            </div>
                            <div className="staff-form-actions">
                                <button type="button" onClick={() => setModalOpen(false)} className="staff-btn-ghost">Cancel</button>
                                <button type="submit" disabled={saving} className="staff-btn-primary" data-testid="staff-form-submit">
                                    {saving ? "Saving…" : (editing ? "Save changes" : "Add Staff")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
