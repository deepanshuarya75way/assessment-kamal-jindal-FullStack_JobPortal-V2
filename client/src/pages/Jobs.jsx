import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";
import JobCard from "../components/JobCard.jsx";
import { employmentTypes, experienceLevels, workModes } from "../constants.js";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    workMode: "",
    experienceLevel: "",
    sort: "newest",
    page: 1
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 9 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput, page: 1 }));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/jobs", { params: { ...filters, limit: 9 } });
        setJobs(data.jobs);
        setPagination(data.pagination);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Open roles</p>
          <h1>Browse Jobs</h1>
        </div>
      </div>

      <div className="filters card">
        <input
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search title, company, location, skill, or description"
          value={searchInput}
        />
        <select onChange={(event) => updateFilter("type", event.target.value)} value={filters.type}>
          <option value="">All types</option>
          {employmentTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select onChange={(event) => updateFilter("workMode", event.target.value)} value={filters.workMode}>
          <option value="">Any work mode</option>
          {workModes.map((mode) => (
            <option key={mode}>{mode}</option>
          ))}
        </select>
        <select
          onChange={(event) => updateFilter("experienceLevel", event.target.value)}
          value={filters.experienceLevel}
        >
          <option value="">Any experience</option>
          {experienceLevels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <select onChange={(event) => updateFilter("sort", event.target.value)} value={filters.sort}>
          <option value="newest">Newest</option>
          <option value="deadline">Deadline soon</option>
          <option value="salary-high">Salary high to low</option>
          <option value="salary-low">Salary low to high</option>
        </select>
      </div>

      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length ? (
        <>
          <div className="results-bar">
            <span>{pagination.total} matching jobs</span>
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
          </div>
          <div className="grid">
            {jobs.map((job) => (
              <JobCard job={job} key={job._id} />
            ))}
          </div>
          <div className="pagination">
            <button
              className="button ghost"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              type="button"
            >
              Previous
            </button>
            <button
              className="button ghost"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="empty">No jobs found. Try a broader search or remove a filter.</div>
      )}
    </section>
  );
};

export default Jobs;
