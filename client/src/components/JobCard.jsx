import { Link } from "./Router.jsx";
import { formatDate } from "../constants.js";

const JobCard = ({ job }) => {
  return (
    <article className="card job-card">
      <div>
        <p className="eyebrow">{job.company}</p>
        <h3>{job.title}</h3>
        <p className="muted">
          {job.location} - {job.workMode || job.employmentType}
        </p>
      </div>

      <p>{job.description.slice(0, 150)}{job.description.length > 150 ? "..." : ""}</p>

      <div className="job-meta">
        <span>{job.employmentType}</span>
        {job.experienceLevel && <span>{job.experienceLevel}</span>}
        {job.status && <span>{job.status}</span>}
        {job.salary && <span>{job.salary}</span>}
      </div>

      {job.tags?.length > 0 && (
        <div className="tag-list">
          {job.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      {job.deadline && <p className="muted small">Apply by {formatDate(job.deadline)}</p>}

      <Link className="button primary full" to={`/jobs/${job._id}`}>
        View details
      </Link>
    </article>
  );
};

export default JobCard;
