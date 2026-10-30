import { Link } from "../components/Router.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Home = () => {
  const { user } = useAuth();
  const dashboardPath =
    user?.role === "recruiter" ? "/recruiter/dashboard" : user?.role === "student" ? "/student/dashboard" : "/register";

  const scrollToOverview = () => {
    document.getElementById("portal-overview")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Full Stack Job Portal</p>
          <h1>Connect students with recruiters in one clean dashboard.</h1>
          <p className="hero-copy">
            Students can discover jobs and track applications. Recruiters can post openings and manage applicants.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/jobs">
              Browse Jobs
            </Link>
            <Link className="button ghost" to={dashboardPath}>
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stat">
            <span>Students</span>
            <strong>Apply faster</strong>
          </div>
          <div className="stat">
            <span>Recruiters</span>
            <strong>Post jobs</strong>
          </div>
          <div className="stat">
            <span>Status</span>
            <strong>Track progress</strong>
          </div>
        </div>

        <button aria-label="Scroll to portal overview" className="scroll-cue" onClick={scrollToOverview} type="button">
          <span>Scroll</span>
        </button>
      </section>

      <section className="overview-section" id="portal-overview">
        <div className="overview-heading">
          <p className="eyebrow">Portal flow</p>
          <h2>Built for both sides of hiring</h2>
        </div>

        <div className="overview-grid">
          <article className="overview-tile">
            <span>01</span>
            <h3>Discover roles</h3>
            <p>Students can search by title, company, location, and employment type.</p>
          </article>
          <article className="overview-tile">
            <span>02</span>
            <h3>Apply with context</h3>
            <p>Each application can include a resume link and a focused cover letter.</p>
          </article>
          <article className="overview-tile">
            <span>03</span>
            <h3>Review candidates</h3>
            <p>Recruiters can manage job posts and move applicants through clear statuses.</p>
          </article>
        </div>
      </section>
    </>
  );
};

export default Home;
