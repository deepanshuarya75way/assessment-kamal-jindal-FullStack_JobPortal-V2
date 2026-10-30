import { useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { useNavigate } from "../components/Router.jsx";
import { employmentTypes, experienceLevels, jobStatuses, splitTags, workModes } from "../constants.js";

const initialForm = {
  title: "",
  company: "",
  location: "",
  employmentType: "Full-time",
  workMode: "On-site",
  experienceLevel: "Entry",
  salary: "",
  salaryMin: "",
  salaryMax: "",
  tags: "",
  deadline: "",
  status: "Open",
  description: "",
  requirements: ""
};

const PostJob = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
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
      const payload = {
        ...form,
        tags: splitTags(form.tags),
        deadline: form.deadline ? new Date(`${form.deadline}T23:59:59.000Z`).toISOString() : ""
      };
      await api.post("/jobs", payload);
      navigate("/recruiter/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page narrow">
      <div className="card">
        <p className="eyebrow">Recruiter</p>
        <h1>Post a Job</h1>
        {error && <p className="alert error">{error}</p>}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Job title
            <input name="title" onChange={handleChange} required value={form.title} />
          </label>
          <label>
            Company
            <input name="company" onChange={handleChange} required value={form.company} />
          </label>
          <label>
            Location
            <input name="location" onChange={handleChange} required value={form.location} />
          </label>
          <label>
            Employment type
            <select name="employmentType" onChange={handleChange} value={form.employmentType}>
              {employmentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Work mode
              <select name="workMode" onChange={handleChange} value={form.workMode}>
                {workModes.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label>
              Experience
              <select name="experienceLevel" onChange={handleChange} value={form.experienceLevel}>
                {experienceLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Salary
            <input name="salary" onChange={handleChange} placeholder="Optional" value={form.salary} />
          </label>
          <div className="form-grid">
            <label>
              Minimum salary
              <input min="0" name="salaryMin" onChange={handleChange} placeholder="Optional" type="number" value={form.salaryMin} />
            </label>
            <label>
              Maximum salary
              <input min="0" name="salaryMax" onChange={handleChange} placeholder="Optional" type="number" value={form.salaryMax} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Application deadline
              <input name="deadline" onChange={handleChange} type="date" value={form.deadline} />
            </label>
            <label>
              Status
              <select name="status" onChange={handleChange} value={form.status}>
                {jobStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Skill tags
            <input name="tags" onChange={handleChange} placeholder="React, Node.js, MongoDB" value={form.tags} />
          </label>
          <label>
            Description
            <textarea name="description" onChange={handleChange} required rows="5" value={form.description} />
          </label>
          <label>
            Requirements
            <textarea name="requirements" onChange={handleChange} required rows="5" value={form.requirements} />
          </label>
          <button className="button primary full" disabled={loading} type="submit">
            {loading ? "Posting..." : "Post Job"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default PostJob;
