import mongoose from "mongoose";
import express from "express";
import { authorize, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { applicationQuerySchema, applySchema, statusSchema } from "../validation/schemas.js";

const router = express.Router();

const populateApplication = (query) =>
  query
    .populate("student", "name email headline location skills bio")
    .populate("job", "title company location recruiter employmentType workMode status");

router.post("/:jobId", protect, authorize("student"), validate(applySchema), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.status === "Closed") {
      return res.status(400).json({ message: "This job is closed for applications." });
    }

    const existingApplication = await Application.findOne({
      student: req.user._id,
      job: job._id
    });

    if (existingApplication) {
      return res.status(409).json({ message: "You have already applied to this job." });
    }

    const application = await Application.create({
      student: req.user._id,
      job: job._id,
      coverLetter: req.body.coverLetter,
      resumeLink: req.body.resumeLink,
      statusHistory: [{ status: "Pending", changedBy: req.user._id }]
    });

    res.status(201).json({ application });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, authorize("student"), async (req, res, next) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate({
        path: "job",
        populate: { path: "recruiter", select: "name email companyName companyWebsite" }
      })
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    next(error);
  }
});

router.get("/recruiter", protect, authorize("recruiter"), validate(applicationQuerySchema, "query"), async (req, res, next) => {
  try {
    const jobQuery = { recruiter: req.user._id };

    if (req.query.jobId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.jobId)) {
        return res.status(400).json({ message: "Job filter is invalid." });
      }

      jobQuery._id = req.query.jobId;
    }

    const jobs = await Job.find(jobQuery).select("_id");
    const jobIds = jobs.map((job) => job._id);
    const applicationQuery = { job: { $in: jobIds } };

    if (req.query.status) {
      applicationQuery.status = req.query.status;
    }

    let applications = await populateApplication(Application.find(applicationQuery)).sort({ createdAt: -1 });

    if (req.query.search) {
      const needle = req.query.search.toLowerCase();
      applications = applications.filter((application) => {
        const student = application.student;
        return [student?.name, student?.email, student?.headline, ...(student?.skills || [])]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle));
      });
    }

    res.json({ applications });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", protect, authorize("recruiter"), validate(statusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate("job");

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only manage applications for your jobs." });
    }

    application.status = status;
    application.statusHistory.push({ status, changedBy: req.user._id });
    await application.save();

    await application.populate("student", "name email headline location skills bio");
    res.json({ application });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, authorize("student"), async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    if (application.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only withdraw your own applications." });
    }

    application.status = "Withdrawn";
    application.withdrawnAt = new Date();
    application.statusHistory.push({ status: "Withdrawn", changedBy: req.user._id });
    await application.save();

    res.json({ application });
  } catch (error) {
    next(error);
  }
});

export default router;
