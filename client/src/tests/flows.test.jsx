import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "../components/Router.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import JobDetails from "../pages/JobDetails.jsx";
import api from "../api/client.js";

vi.mock("../api/client.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  getErrorMessage: (error) => error.response?.data?.message || error.message || "Something went wrong"
}));

const renderWithProviders = (ui) => {
  return render(
    <RouterProvider>
      <AuthProvider>{ui}</AuthProvider>
    </RouterProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, "", "/");
});

describe("frontend flows", () => {
  it("submits login credentials and redirects by role", async () => {
    api.get.mockRejectedValue(new Error("No session"));
    api.post.mockResolvedValue({ data: { user: { name: "Recruiter", role: "recruiter" } } });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "recruiter@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        email: "recruiter@example.com",
        password: "password123"
      });
      expect(window.location.pathname).toBe("/recruiter/dashboard");
    });
  });

  it("registers a student profile with parsed skills", async () => {
    api.get.mockRejectedValue(new Error("No session"));
    api.post.mockResolvedValue({ data: { user: { name: "Student", role: "student" } } });

    renderWithProviders(<Register />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Student" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Skills"), { target: { value: "React, SQL" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({
          email: "student@example.com",
          skills: ["React", "SQL"]
        })
      );
      expect(window.location.pathname).toBe("/student/dashboard");
    });
  });

  it("applies to a job with resume link and cover letter", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/auth/me") {
        return Promise.resolve({ data: { user: { name: "Student", role: "student" } } });
      }

      if (url === "/jobs/job1") {
        return Promise.resolve({
          data: {
            job: {
              _id: "job1",
              title: "Frontend Developer",
              company: "Acme",
              location: "Remote",
              employmentType: "Full-time",
              workMode: "Remote",
              experienceLevel: "Entry",
              status: "Open",
              description: "Build interfaces.",
              requirements: "React experience.",
              recruiter: { name: "Recruiter", companyName: "Acme" }
            }
          }
        });
      }

      return Promise.reject(new Error("Unknown endpoint"));
    });
    api.post.mockResolvedValue({ data: { application: { _id: "app1" } } });

    renderWithProviders(<JobDetails id="job1" />);

    await screen.findByRole("heading", { name: "Frontend Developer" });
    fireEvent.change(screen.getByLabelText("Resume link"), {
      target: { value: "https://example.com/resume.pdf" }
    });
    fireEvent.change(screen.getByLabelText("Cover letter"), {
      target: { value: "I can help build polished interfaces." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Now" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/applications/job1", {
        resumeLink: "https://example.com/resume.pdf",
        coverLetter: "I can help build polished interfaces."
      });
      expect(screen.getByText("Application submitted successfully.")).toBeInTheDocument();
    });
  });
});
