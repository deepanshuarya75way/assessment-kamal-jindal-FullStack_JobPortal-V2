import { useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import { Link } from "../components/Router.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  applicationStatuses,
  employmentTypes,
  experienceLevels,
  formatDate,
  jobStatuses,
  splitTags,
  workModes
} from "../constants.js";

const emptyEditForm = {
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

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const toEditForm = (job) => ({
  title: job.title || "",
  company: job.company || "",
  location: job.location || "",
  employmentType: job.employmentType || "Full-time",
  workMode: job.workMode || "On-site",
  experienceLevel: job.experienceLevel || "Entry",
  salary: job.salary || "",
  salaryMin: job.salaryMin ?? "",
  salaryMax: job.salaryMax ?? "",
  tags: job.tags?.join(", ") || "",
  deadline: toDateInput(job.deadline),
  status: job.status || "Open",
  description: job.description || "",
  requirements: job.requirements || ""
});

const RecruiterDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationFilters, setApplicationFilters] = useState({ search: "", status: "", jobId: "" });
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const filteredApplications = useMemo(() => applications, [applications]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [jobsResponse, applicationsResponse] = await Promise.all([
        api.get("/jobs/mine"),
        api.get("/applications/recruiter", { params: applicationFilters })
      ]);
      setJobs(jobsResponse.data.jobs);
      setApplications(applicationsResponse.data.applications);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [applicationFilters]);

  const deleteJob = async (jobId) => {
    const shouldDelete = window.confirm("Delete this job and its related applications?");

    if (!shouldDelete) {
      return;
    }

    try {
      await api.delete(`/jobs/${jobId}`);
      await fetchDashboard();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const startEditing = (job) => {
    setEditingJob(job);
    setEditForm(toEditForm(job));
    setError("");
  };

  const closeEdit = () => {
    setEditingJob(null);
    setEditForm(emptyEditForm);
  };

  const updateEditField = (event) => {
    setEditForm({ ...editForm, [event.target.name]: event.target.value });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setError("");

    try {
      const payload = {
        ...editForm,
        tags: splitTags(editForm.tags),
        deadline: editForm.deadline ? new Date(`${editForm.deadline}T23:59:59.000Z`).toISOString() : ""
      };
      const { data } = await api.put(`/jobs/${editingJob._id}`, payload);
      setJobs((current) => current.map((job) => (job._id === editingJob._id ? data.job : job)));
      closeEdit();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const updateStatus = async (applicationId, status) => {
    try {
      const { data } = await api.patch(`/applications/${applicationId}/status`, { status });
      setApplications((current) =>
        current.map((application) =>
          application._id === applicationId
            ? { ...application, status: data.application.status, statusHistory: data.application.statusHistory }
            : application
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateApplicationFilter = (name, value) => {
    setApplicationFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <section className="page recruiter-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Recruiter Dashboard</p>
          <h1>Manage Jobs & Applications</h1>
        </div>
        <Link className="button primary" to="/recruiter/post-job">
          Post Job
        </Link>
      </div>

      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <div className="dashboard-grid">
          <section className="card">
            <h2>Posted Jobs</h2>
            {jobs.length ? (
              <div className="stack">
                {jobs.map((job) => (
                  <article className="mini-card job-admin-card" key={job._id}>
                    <div>
                      <div className="job-title-row">
                        <h3>{job.title}</h3>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="muted">
                        {job.company} - {job.location}
                      </p>
                      <p className="muted small">
                        {job.employmentType} - {job.workMode || "On-site"} - {job.experienceLevel || "Entry"}
                        {job.deadline ? ` - Apply by ${formatDate(job.deadline)}` : ""}
                      </p>
                      {job.tags?.length > 0 && (
                        <div className="tag-list compact">
                          {job.tags.slice(0, 5).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="actions">
                      <button className="button ghost" onClick={() => startEditing(job)} type="button">
                        Edit
                      </button>
                      <button className="button danger" onClick={() => deleteJob(job._id)} type="button">
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No jobs posted yet.</p>
            )}
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>Applications</h2>
              <span className="muted">{filteredApplications.length} candidates</span>
            </div>
            <div className="filters recruiter-filters">
              <input
                onChange={(event) => updateApplicationFilter("search", event.target.value)}
                placeholder="Search applicants"
                value={applicationFilters.search}
              />
              <select onChange={(event) => updateApplicationFilter("status", event.target.value)} value={applicationFilters.status}>
                <option value="">All statuses</option>
                {applicationStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select onChange={(event) => updateApplicationFilter("jobId", event.target.value)} value={applicationFilters.jobId}>
                <option value="">All jobs</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
            {filteredApplications.length ? (
              <div className="stack">
                {filteredApplications.map((application) => (
                  <article className="application-review" key={application._id}>
                    <div className="application-review-top">
                      <div>
                        <p className="eyebrow">{application.job?.title}</p>
                        <h3>{application.student?.name}</h3>
                        <p className="muted">
                          {application.student?.email}
                          {application.student?.location ? ` - ${application.student.location}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>

                    {(application.student?.headline || application.student?.bio) && (
                      <div className="profile-panel compact-panel">
                        {application.student?.headline && <strong>{application.student.headline}</strong>}
                        {application.student?.bio && <p>{application.student.bio}</p>}
                      </div>
                    )}

                    {application.student?.skills?.length > 0 && (
                      <div className="tag-list compact">
                        {application.student.skills.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    )}

                    <div className="candidate-materials">
                      {application.resumeLink ? (
                        <a className="button ghost" href={application.resumeLink} rel="noreferrer" target="_blank">
                          Open Resume
                        </a>
                      ) : (
                        <span className="muted">No resume link</span>
                      )}
                      <select
                        disabled={application.status === "Withdrawn"}
                        onChange={(event) => updateStatus(application._id, event.target.value)}
                        value={application.status === "Withdrawn" ? "" : application.status}
                      >
                        {application.status === "Withdrawn" && <option value="">Withdrawn</option>}
                        {applicationStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <details className="cover-letter">
                      <summary>Cover letter preview</summary>
                      <p className="preserve-lines">{application.coverLetter || "No cover letter provided."}</p>
                    </details>

                    {application.statusHistory?.length > 0 && (
                      <p className="muted small">
                        Last updated {formatDate(application.statusHistory.at(-1).changedAt || application.updatedAt)}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No applications match these filters.</p>
            )}
          </section>
        </div>
      )}

      {editingJob && (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="modal card" role="dialog">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Edit job</p>
                <h2>{editingJob.title}</h2>
              </div>
              <button className="button ghost" onClick={closeEdit} type="button">
                Close
              </button>
            </div>

            <form className="form" onSubmit={submitEdit}>
              <div className="form-grid">
                <label>
                  Job title
                  <input name="title" onChange={updateEditField} required value={editForm.title} />
                </label>
                <label>
                  Company
                  <input name="company" onChange={updateEditField} required value={editForm.company} />
                </label>
              </div>
              <label>
                Location
                <input name="location" onChange={updateEditField} required value={editForm.location} />
              </label>
              <div className="form-grid">
                <label>
                  Employment type
                  <select name="employmentType" onChange={updateEditField} value={editForm.employmentType}>
                    {employmentTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Work mode
                  <select name="workMode" onChange={updateEditField} value={editForm.workMode}>
                    {workModes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Experience
                  <select name="experienceLevel" onChange={updateEditField} value={editForm.experienceLevel}>
                    {experienceLevels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" onChange={updateEditField} value={editForm.status}>
                    {jobStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Salary label
                <input name="salary" onChange={updateEditField} placeholder="Optional" value={editForm.salary} />
              </label>
              <div className="form-grid">
                <label>
                  Minimum salary
                  <input min="0" name="salaryMin" onChange={updateEditField} type="number" value={editForm.salaryMin} />
                </label>
                <label>
                  Maximum salary
                  <input min="0" name="salaryMax" onChange={updateEditField} type="number" value={editForm.salaryMax} />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Deadline
                  <input name="deadline" onChange={updateEditField} type="date" value={editForm.deadline} />
                </label>
                <label>
                  Skill tags
                  <input name="tags" onChange={updateEditField} value={editForm.tags} />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" onChange={updateEditField} required rows="4" value={editForm.description} />
              </label>
              <label>
                Requirements
                <textarea name="requirements" onChange={updateEditField} required rows="4" value={editForm.requirements} />
              </label>
              <button className="button primary full" disabled={savingEdit} type="submit">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default RecruiterDashboard;
