import mongoose from "mongoose";
import express from "express";

import { authorize, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

import Application from "../models/Application.js";
import Job from "../models/Job.js";

import {
  applicationQuerySchema,
  applySchema,
  statusSchema
} from "../validation/schemas.js";

const router = express.Router();

const interviewStages = [
  "Technical",
  "HR",
  "Managerial",
  "Final",
  "Other"
];

const populateApplication = (query) =>
  query.populate("student", "name email headline location skills bio")
    .populate(
      "job",
      "title company location recruiter employmentType workMode status"
    );

const populateInterviewApplication = async (application) => {
  await application.populate([
    {
      path: "student",
      select: "name email headline location skills bio"
    },
    {
      path: "job",
      select: "title company location recruiter employmentType workMode status"
    }
  ]);

  return application;
};

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getScheduledDate = (body) => {
  let value = body.scheduledAt;

  if (!value && body.interviewDate && body.interviewTime) {
    value = `${body.interviewDate}T${body.interviewTime}`;
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const findRecruiterApplication = async (applicationId, recruiterId) => {
  const application = await Application.findById(applicationId).populate(
    "job",
    "title company location recruiter"
  );

  if (!application) {
    return {
      error: {
        status: 404,
        message: "Application not found."
      }
    };
  }

  if (!application.job) {
    return {
      error: {
        status: 404,
        message: "The related job was not found."
      }
    };
  }

  if (
    application.job.recruiter.toString() !== recruiterId.toString()
  ) {
    return {
      error: {
        status: 403,
        message: "You can only manage applications for your own jobs."
      }
    };
  }

  return { application };
};

/* =========================================================
APPLY FOR A JOB
========================================================= */

router.post(
  "/:jobId",
  protect,
  authorize("student"),
  validate(applySchema),
  async (req, res, next) => {
    try {
      const job = await Job.findById(req.params.jobId);

      if (!job) {
        return res.status(404).json({
          message: "Job not found."
        });
      }

      if (job.status === "Closed") {
        return res.status(400).json({
          message: "This job is closed for applications."
        });
      }

      const existingApplication = await Application.findOne({
        student: req.user._id,
        job: job._id
      });

      if (existingApplication) {
        return res.status(409).json({
          message: "You have already applied to this job."
        });
      }

      const application = await Application.create({
        student: req.user._id,
        job: job._id,
        coverLetter: req.body.coverLetter,
        resumeLink: req.body.resumeLink,
        statusHistory: [
          {
            status: "Pending",
            changedBy: req.user._id
          }
        ]
      });

      await populateInterviewApplication(application);

      res.status(201).json({ application });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
STUDENT: GET MY APPLICATIONS AND INTERVIEWS
========================================================= */

router.get(
  "/me",
  protect,
  authorize("student"),
  async (req, res, next) => {
    try {
      const applications = await Application.find({
        student: req.user._id
      })
        .populate({
          path: "job",
          populate: {
            path: "recruiter",
            select: "name email companyName companyWebsite"
          }
        })
        .sort({ createdAt: -1 });

      res.json({ applications });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/recruiter",
  protect,
  authorize("recruiter"),
  validate(applicationQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const jobQuery = {
        recruiter: req.user._id
      };

      if (req.query.jobId) {
        if (!isValidId(req.query.jobId)) {
          return res.status(400).json({
            message: "Job filter is invalid."
          });
        }

        jobQuery._id = req.query.jobId;
      }

      const jobs = await Job.find(jobQuery).select("_id");

      const jobIds = jobs.map((job) => job._id);

      const applicationQuery = {
        job: { $in: jobIds }
      };

      if (req.query.status) {
        applicationQuery.status = req.query.status;
      }

      let applications = await populateApplication(
        Application.find(applicationQuery)
      ).sort({ createdAt: -1 });

      if (req.query.search) {
        const needle = req.query.search.toLowerCase();

        applications = applications.filter((application) => {
          const student = application.student;

          return [
            student?.name,
            student?.email,
            student?.headline,
            ...(student?.skills || [])
          ]
            .filter(Boolean)
            .some((value) =>
              value.toLowerCase().includes(needle)
            );
        });
      }

      res.json({ applications });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/interviews",
  protect,
  authorize("recruiter"),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      const result = await findRecruiterApplication(
        req.params.id,
        req.user._id
      );

      if (result.error) {
        return res.status(result.error.status).json({
          message: result.error.message
        });
      }

      const { application } = result;

      if (application.status !== "Shortlisted") {
        return res.status(400).json({
          message: "Only shortlisted applicants can be scheduled for interviews."
        });
      }

      const scheduledAt = getScheduledDate(req.body);

      if (!scheduledAt) {
        return res.status(400).json({
          message: "A valid interview date and time are required."
        });
      }

      const stage = req.body.stage || "Technical";

      if (!interviewStages.includes(stage)) {
        return res.status(400).json({
          message: "Invalid interview stage."
        });
      }

      const meetingLink = String(
        req.body.meetingLink || ""
      ).trim();

      const notes = String(
        req.body.notes || ""
      ).trim();

      if (meetingLink.length > 1000 || notes.length > 2000) {
        return res.status(400).json({
          message: "Meeting link or notes are too long."
        });
      }

      application.interviews.push({
        scheduledAt,
        stage,
        meetingLink,
        notes,
        status: "Scheduled",
        applicantResponse: "Pending",
        createdBy: req.user._id
      });

      await application.save();

      await populateInterviewApplication(application);

      res.status(201).json({
        message: "Interview scheduled successfully.",
        application
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/interviews/:interviewId",
  protect,
  authorize("recruiter"),
  async (req, res, next) => {
    try {
      if (
        !isValidId(req.params.id) ||
        !isValidId(req.params.interviewId)
      ) {
        return res.status(400).json({
          message: "Invalid application or interview ID."
        });
      }

      const result = await findRecruiterApplication(
        req.params.id,
        req.user._id
      );

      if (result.error) {
        return res.status(result.error.status).json({
          message: result.error.message
        });
      }

      const { application } = result;

      const interview = application.interviews.id(
        req.params.interviewId
      );

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found."
        });
      }

      if (interview.status === "Cancelled") {
        return res.status(400).json({
          message: "A cancelled interview cannot be updated."
        });
      }

      const { rescheduleDecision } = req.body;

      if (
        rescheduleDecision &&
        !["approve", "decline"].includes(rescheduleDecision)
      ) {
        return res.status(400).json({
          message: "Invalid rescheduling decision."
        });
      }

      if (rescheduleDecision) {
        if (
          interview.rescheduleRequest?.status !== "Pending"
        ) {
          return res.status(400).json({
            message: "There is no pending rescheduling request."
          });
        }

        if (rescheduleDecision === "approve") {
          const newDate = getScheduledDate(req.body);

          if (!newDate) {
            return res.status(400).json({
              message: "A valid new interview date is required."
            });
          }

          interview.scheduledAt = newDate;
          interview.rescheduleRequest.status = "Approved";
        } else {
          interview.rescheduleRequest.status = "Declined";
        }

        interview.applicantResponse = "Pending";
      }

      if (req.body.scheduledAt !== undefined) {
        const scheduledAt = getScheduledDate(req.body);

        if (!scheduledAt) {
          return res.status(400).json({
            message: "Invalid interview date and time."
          });
        }

        interview.scheduledAt = scheduledAt;
        interview.applicantResponse = "Pending";
      }

      if (req.body.stage !== undefined) {
        if (!interviewStages.includes(req.body.stage)) {
          return res.status(400).json({
            message: "Invalid interview stage."
          });
        }

        interview.stage = req.body.stage;
      }

      if (req.body.meetingLink !== undefined) {
        const meetingLink = String(req.body.meetingLink).trim();

        if (meetingLink.length > 1000) {
          return res.status(400).json({
            message: "Meeting link is too long."
          });
        }

        interview.meetingLink = meetingLink;
      }

      if (req.body.notes !== undefined) {
        const notes = String(req.body.notes).trim();

        if (notes.length > 2000) {
          return res.status(400).json({
            message: "Interview notes are too long."
          });
        }

        interview.notes = notes;
      }

      interview.updatedBy = req.user._id;

      await application.save();

      await populateInterviewApplication(application);

      res.json({
        message: "Interview updated successfully.",
        application
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/interviews/:interviewId",
  protect,
  authorize("recruiter"),
  async (req, res, next) => {
    try {
      if (
        !isValidId(req.params.id) ||
        !isValidId(req.params.interviewId)
      ) {
        return res.status(400).json({
          message: "Invalid application or interview ID."
        });
      }

      const result = await findRecruiterApplication(
        req.params.id,
        req.user._id
      );

      if (result.error) {
        return res.status(result.error.status).json({
          message: result.error.message
        });
      }

      const { application } = result;

      const interview = application.interviews.id(
        req.params.interviewId
      );

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found."
        });
      }

      interview.status = "Cancelled";
      interview.updatedBy = req.user._id;

      await application.save();

      await populateInterviewApplication(application);

      res.json({
        message: "Interview cancelled successfully.",
        application
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/interviews/:interviewId/response",
  protect,
  authorize("student"),
  async (req, res, next) => {
    try {
      if (
        !isValidId(req.params.id) ||
        !isValidId(req.params.interviewId)
      ) {
        return res.status(400).json({
          message: "Invalid application or interview ID."
        });
      }

      const application = await Application.findById(
        req.params.id
      );

      if (!application) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      if (
        application.student.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only respond to your own interviews."
        });
      }

      const interview = application.interviews.id(
        req.params.interviewId);

      if (!interview) {
        return res.status(404).json({
          message: "Interview not found."
        });
      }

      if (interview.status === "Cancelled") {
        return res.status(400).json({
          message: "This interview has been cancelled."
        });
      }

      const { action } = req.body;

      if (action === "confirm") {
        interview.applicantResponse = "Confirmed";
      } else if (action === "reschedule") {
        const preferredAt = req.body.preferredAt
          ? new Date(req.body.preferredAt)
          : null;

        if (
          !preferredAt ||
          Number.isNaN(preferredAt.getTime())
        ) {
          return res.status(400).json({
            message: "Please provide a valid preferred date and time."
          });
        }

        const note = String(req.body.note || "").trim();

        if (!note) {
          return res.status(400).json({
            message: "Please provide a reason for rescheduling."
          });
        }

        interview.applicantResponse = "Reschedule Requested";

        interview.rescheduleRequest = {
          requestedAt: new Date(),
          preferredAt,
          note,
          status: "Pending"
        };
      } else {
        return res.status(400).json({
          message: "Action must be confirm or reschedule."
        });
      }

      await application.save();

      await populateInterviewApplication(application);

      res.json({
        message:
          action === "confirm"
            ? "Your attendance has been confirmed."
            : "Your rescheduling request has been submitted.",
        application
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/status",
  protect,
  authorize("recruiter"),
  validate(statusSchema),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      const { status } = req.body;

      const application = await Application.findById(
        req.params.id
      ).populate("job");

      if (!application) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      if (
        !application.job ||
        application.job.recruiter.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only manage applications for your jobs."
        });
      }

      application.status = status;

      application.statusHistory.pushhh({
        status,
        changedBy: req.user._id
      });

      await application.save();

      await populateInterviewApplication(application);

      res.json({ application });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  authorize("student"),
  async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      const application = await Application.findById(
        req.params.id
      );

      if (!application) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      if (
        application.student.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only withdraw your own applications."
        });
      }

      application.status = "Withdrawn";
      application.withdrawnAt = new Date();

      application.statusHistory.push({
        status: "Withdrawn",
        changedBy: req.user._id
      });

      await application.save();

      await populateInterviewApplication(application);

      res.json({ application });
    } catch (error) {
      next(error);
    }
  }
);

export default router;