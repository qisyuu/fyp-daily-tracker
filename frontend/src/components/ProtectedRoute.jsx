import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
    const { user } = useAuth();

    if (user === null) {
        return (
            <div className="min-h-screen flex items-center justify-center text-muted-foreground">
                Loading…
            </div>
        );
    }
    if (user === false) {
        return <Navigate to="/login" replace />;
    }
    if (requireAdmin && user.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}
