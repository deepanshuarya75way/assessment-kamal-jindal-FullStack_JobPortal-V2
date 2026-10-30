import { useAuth } from "../context/AuthContext.jsx";
import { Link, NavLink, useNavigate } from "./Router.jsx";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        JobPortal
      </Link>

      <nav className="nav-links">
        <NavLink to="/jobs">Jobs</NavLink>
        {user?.role === "student" && <NavLink to="/student/dashboard">My Applications</NavLink>}
        {user?.role === "recruiter" && (
          <>
            <NavLink to="/recruiter/dashboard">Recruiter Dashboard</NavLink>
            <NavLink to="/recruiter/post-job">Post Job</NavLink>
          </>
        )}
      </nav>

      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <span className="user-chip">{user.name}</span>
            <button className="button ghost" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="button ghost" to="/login">
              Login
            </Link>
            <Link className="button primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
