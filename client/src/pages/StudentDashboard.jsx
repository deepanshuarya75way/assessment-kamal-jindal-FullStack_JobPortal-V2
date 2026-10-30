import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import JobCard from "../components/JobCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate } from "../constants.js";

const StudentDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      const [applicationsResponse, savedJobsResponse] = await Promise.all([
        api.get("/applications/me"),
        api.get("/jobs/saved")
      ]);
      setApplications(applicationsResponse.data.applications);
      setSavedJobs(savedJobsResponse.data.jobs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const withdrawApplication = async (applicationId) => {
    const shouldWithdraw = window.confirm("Withdraw this application?");

    if (!shouldWithdraw) {
      return;
    }

    try {
      const { data } = await api.delete(`/applications/${applicationId}`);
      setApplications((current) =>
        current.map((application) => (application._id === applicationId ? data.application : application))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Student Dashboard</p>
          <h1>My Applications</h1>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p>Loading applications...</p>
      ) : (
        <div className="dashboard-grid">
          <section className="card">
            <h2>Applications</h2>
            {applications.length ? (
              <div className="stack">
                {applications.map((application) => (
                  <article className="application-row" key={application._id}>
                    <div>
                      <p className="eyebrow">{application.job?.company}</p>
                      <h3>{application.job?.title}</h3>
                      <p className="muted">
                        {application.job?.location}
                        {application.createdAt ? ` - Applied ${formatDate(application.createdAt)}` : ""}
                      </p>
                    </div>
                    <div className="actions">
                      <StatusBadge status={application.status} />
                      {application.status !== "Withdrawn" && (
                        <button className="button danger" onClick={() => withdrawApplication(application._id)} type="button">
                          Withdraw
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">You have not applied to any jobs yet.</div>
            )}
          </section>

          <section className="card">
            <h2>Saved Jobs</h2>
            {savedJobs.length ? (
              <div className="stack">
                {savedJobs.map((job) => (
                  <JobCard job={job} key={job._id} />
                ))}
              </div>
            ) : (
              <p className="muted">Save jobs from the job detail page to compare them later.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default StudentDashboard;
