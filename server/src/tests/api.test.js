import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import Application from "../models/Application.js";

let app;
let mongoServer;

const register = async (agent, payload) => {
  const response = await agent.post("/api/auth/register").send({
    name: payload.name,
    email: payload.email,
    password: "password123",
    role: payload.role,
    headline: payload.headline || "",
    skills: payload.skills || []
  });

  return response;
};

const createJob = async (agent, overrides = {}) => {
  const response = await agent.post("/api/jobs").send({
    title: "Frontend Developer",
    company: "Acme",
    location: "Remote",
    employmentType: "Full-time",
    workMode: "Remote",
    experienceLevel: "Entry",
    salary: "$80k",
    description: "Build useful product interfaces.",
    requirements: "React, accessibility, and API experience.",
    tags: ["React", "Node"],
    ...overrides
  });

  return response;
};

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-validation";
  process.env.MONGO_URI = "mongodb://127.0.0.1/test";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = await import("../index.js"));
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("job portal API", () => {
  it("registers, logs in, and protects role-only routes", async () => {
    const student = request.agent(app);

    await student.post("/api/auth/register").send({
      name: "Student One",
      email: "student@example.com",
      password: "password123",
      role: "student"
    });

    const blocked = await createJob(student);

    expect(blocked.status).toBe(403);
  });

  it("validates auth and application payloads", async () => {
    const badRegister = await request(app).post("/api/auth/register").send({
      name: "Bad",
      email: "not-an-email",
      password: "short",
      role: "student"
    });

    expect(badRegister.status).toBe(400);

    const recruiter = request.agent(app);
    const student = request.agent(app);
    await register(recruiter, { name: "Recruiter", email: "recruiter@example.com", role: "recruiter" });
    await register(student, { name: "Student", email: "student@example.com", role: "student" });

    const jobResponse = await createJob(recruiter);
    const badApplication = await student.post(`/api/applications/${jobResponse.body.job._id}`).send({
      resumeLink: "not-a-url"
    });

    expect(badApplication.status).toBe(400);
  });

  it("enforces recruiter ownership when editing jobs", async () => {
    const owner = request.agent(app);
    const otherRecruiter = request.agent(app);
    await register(owner, { name: "Owner", email: "owner@example.com", role: "recruiter" });
    await register(otherRecruiter, { name: "Other", email: "other@example.com", role: "recruiter" });

    const jobResponse = await createJob(owner);
    const blocked = await otherRecruiter.put(`/api/jobs/${jobResponse.body.job._id}`).send({ title: "Changed" });
    const allowed = await owner.put(`/api/jobs/${jobResponse.body.job._id}`).send({ title: "Updated title" });

    expect(blocked.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.body.job.title).toBe("Updated title");
  });

  it("prevents duplicate applications and allows recruiter status updates", async () => {
    const recruiter = request.agent(app);
    const student = request.agent(app);
    await register(recruiter, { name: "Recruiter", email: "recruiter@example.com", role: "recruiter" });
    await register(student, {
      name: "Student",
      email: "student@example.com",
      role: "student",
      headline: "React developer",
      skills: ["React"]
    });

    const jobResponse = await createJob(recruiter);
    const applyResponse = await student.post(`/api/applications/${jobResponse.body.job._id}`).send({
      resumeLink: "https://example.com/resume.pdf",
      coverLetter: "I would love to help."
    });
    const duplicate = await student.post(`/api/applications/${jobResponse.body.job._id}`).send({
      resumeLink: "https://example.com/resume.pdf"
    });
    const statusResponse = await recruiter.patch(`/api/applications/${applyResponse.body.application._id}/status`).send({
      status: "Shortlisted"
    });
    const savedApplication = await Application.findById(applyResponse.body.application._id);

    expect(applyResponse.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.application.status).toBe("Shortlisted");
    expect(savedApplication.statusHistory).toHaveLength(2);
  });
});
