import { useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Link, useNavigate } from "../components/Router.jsx";
import { splitTags } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    headline: "",
    location: "",
    skills: "",
    bio: "",
    companyName: "",
    companyWebsite: "",
    companyDescription: ""
  });
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
      const { data } = await api.post("/auth/register", {
        ...form,
        skills: splitTags(form.skills)
      });
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
        <p className="eyebrow">Join the portal</p>
        <h1>Create account</h1>
        {error && <p className="alert error">{error}</p>}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" onChange={handleChange} required value={form.name} />
          </label>
          <label>
            Email
            <input name="email" onChange={handleChange} required type="email" value={form.email} />
          </label>
          <label>
            Password
            <input
              minLength="8"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>
          <label>
            Account type
            <select name="role" onChange={handleChange} value={form.role}>
              <option value="student">Student</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </label>
          <label>
            Headline
            <input
              maxLength="120"
              name="headline"
              onChange={handleChange}
              placeholder={form.role === "student" ? "Frontend developer, data analyst..." : "Technical recruiter"}
              value={form.headline}
            />
          </label>
          <label>
            Location
            <input maxLength="120" name="location" onChange={handleChange} placeholder="City, country" value={form.location} />
          </label>
          {form.role === "student" ? (
            <>
              <label>
                Skills
                <input name="skills" onChange={handleChange} placeholder="React, Python, SQL" value={form.skills} />
              </label>
              <label>
                Profile summary
                <textarea maxLength="800" name="bio" onChange={handleChange} rows="4" value={form.bio} />
              </label>
            </>
          ) : (
            <>
              <label>
                Company name
                <input maxLength="120" name="companyName" onChange={handleChange} value={form.companyName} />
              </label>
              <label>
                Company website
                <input name="companyWebsite" onChange={handleChange} placeholder="https://..." type="url" value={form.companyWebsite} />
              </label>
              <label>
                Company profile
                <textarea
                  maxLength="1000"
                  name="companyDescription"
                  onChange={handleChange}
                  rows="4"
                  value={form.companyDescription}
                />
              </label>
            </>
          )}
          <button className="button primary full" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="muted center">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
};

export default Register;
