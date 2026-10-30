import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Link, useNavigate } from "../components/Router.jsx";
import { formatDate } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";

const JobDetails = ({ id }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [application, setApplication] = useState({ coverLetter: "", resumeLink: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data.job);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleApply = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/applications/${id}`, application);
      setMessage("Application submitted successfully.");
      setApplication({ coverLetter: "", resumeLink: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const saveJob = async () => {
    setError("");
    setSaving(true);

    try {
      await api.post(`/jobs/${id}/save`);
      setMessage("Job saved to your dashboard.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="page">Loading job...</section>;
  }

  if (!job) {
    return <section className="page">{error || "Job not found."}</section>;
  }

  const isClosed = job.status === "Closed";

  return (
    <section className="page split">
      <article className="card detail-card">
        <p className="eyebrow">{job.company}</p>
        <h1>{job.title}</h1>
        <div className="job-meta">
          <span>{job.location}</span>
          <span>{job.employmentType}</span>
          {job.workMode && <span>{job.workMode}</span>}
          {job.experienceLevel && <span>{job.experienceLevel}</span>}
          {job.salary && <span>{job.salary}</span>}
          <span>{job.status}</span>
        </div>

        {job.tags?.length > 0 && (
          <div className="tag-list">
            {job.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className="info-strip">
          {job.deadline ? <span>Apply by {formatDate(job.deadline)}</span> : <span>No deadline listed</span>}
          {job.salaryMin || job.salaryMax ? (
            <span>
              Range: {job.salaryMin || "Open"} - {job.salaryMax || "Open"}
            </span>
          ) : null}
        </div>

        <h2>Description</h2>
        <p className="preserve-lines">{job.description}</p>

        <h2>Requirements</h2>
        <p className="preserve-lines">{job.requirements}</p>

        <div className="profile-panel">
          <p className="eyebrow">Recruiter profile</p>
          <h3>{job.recruiter?.companyName || job.recruiter?.name}</h3>
          {job.recruiter?.companyDescription && <p>{job.recruiter.companyDescription}</p>}
          <p className="muted">
            Posted by {job.recruiter?.name}
            {job.recruiter?.companyWebsite ? (
              <>
                {" "}
                -{" "}
                <a href={job.recruiter.companyWebsite} rel="noreferrer" target="_blank">
                  Company site
                </a>
              </>
            ) : null}
          </p>
        </div>
      </article>

      <aside className="card">
        <h2>Apply for this job</h2>
        {message && <p className="alert success">{message}</p>}
        {error && <p className="alert error">{error}</p>}

        {!isAuthenticated && (
          <p>
            <Link to="/login">Login</Link> as a student to apply.
          </p>
        )}

        {user?.role === "student" && (
          <button className="button ghost full" disabled={saving} onClick={saveJob} type="button">
            {saving ? "Saving..." : "Save Job"}
          </button>
        )}

        {user?.role === "recruiter" && <p className="muted">Recruiter accounts cannot apply to jobs.</p>}
        {isClosed && <p className="alert error">This job is closed for new applications.</p>}

        {(!user || user.role === "student") && !isClosed && (
          <form className="form" onSubmit={handleApply}>
            <label>
              Resume link
              <input
                maxLength="500"
                name="resumeLink"
                onChange={(event) => setApplication({ ...application, resumeLink: event.target.value })}
                placeholder="https://..."
                type="url"
                value={application.resumeLink}
              />
            </label>
            <label>
              Cover letter
              <textarea
                maxLength="3000"
                name="coverLetter"
                onChange={(event) => setApplication({ ...application, coverLetter: event.target.value })}
                placeholder="Write a short note to the recruiter"
                rows="6"
                value={application.coverLetter}
              />
            </label>
            <button className="button primary full" disabled={submitting} type="submit">
              {submitting ? "Applying..." : "Apply Now"}
            </button>
          </form>
        )}
      </aside>
    </section>
  );
};

export default JobDetails;
