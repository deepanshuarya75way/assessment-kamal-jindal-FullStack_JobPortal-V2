import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "./Router.jsx";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="page narrow">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to="/jobs" />;
  }

  return children;
};

export default ProtectedRoute;
