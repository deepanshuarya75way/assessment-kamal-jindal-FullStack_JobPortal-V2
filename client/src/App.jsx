import { Navigate, matchPath, useRouter } from "./components/Router.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import JobDetails from "./pages/JobDetails.jsx";
import Jobs from "./pages/Jobs.jsx";
import Login from "./pages/Login.jsx";
import PostJob from "./pages/PostJob.jsx";
import RecruiterDashboard from "./pages/RecruiterDashboard.jsx";
import Register from "./pages/Register.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";

const routes = [
  { path: "/", element: <Home /> },
  { path: "/jobs", element: <Jobs /> },
  {
    path: "/jobs/:id",
    element: ({ params }) => <JobDetails id={params.id} />
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/student/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <StudentDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/recruiter/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["recruiter"]}>
        <RecruiterDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/recruiter/post-job",
    element: (
      <ProtectedRoute allowedRoles={["recruiter"]}>
        <PostJob />
      </ProtectedRoute>
    )
  }
];

const App = () => {
  const { path } = useRouter();
  const route = routes
    .map((definition) => ({ ...definition, match: matchPath(definition.path, path) }))
    .find((definition) => definition.match);

  const content = route
    ? typeof route.element === "function"
      ? route.element(route.match)
      : route.element
    : <Navigate replace to="/" />;

  return (
    <>
      <Navbar />
      <main>{content}</main>
    </>
  );
};

export default App;
