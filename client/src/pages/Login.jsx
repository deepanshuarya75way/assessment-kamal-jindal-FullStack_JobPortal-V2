import { useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Link, useNavigate } from "../components/Router.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      loginWithResponse(data);
      navigate(data.user.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page narrow">
      <div className="card">
        <p className="eyebrow">Welcome back</p>
        <h1>Login</h1>
        {error && <p className="alert error">{error}</p>}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" onChange={handleChange} required type="email" value={form.email} />
          </label>
          <label>
            Password
            <input name="password" onChange={handleChange} required type="password" value={form.password} />
          </label>
          <button className="button primary full" disabled={loading} type="submit">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="muted center">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
