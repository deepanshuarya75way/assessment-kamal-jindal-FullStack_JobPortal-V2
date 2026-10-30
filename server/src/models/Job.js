import mongoose from "mongoose";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_STATUSES, WORK_MODES } from "../constants.js";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      default: "Full-time"
    },
    workMode: {
      type: String,
      enum: WORK_MODES,
      default: "On-site"
    },
    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVELS,
      default: "Entry"
    },
    salary: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    salaryMin: {
      type: Number,
      min: 0
    },
    salaryMax: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000
    },
    requirements: {
      type: String,
      required: true,
      maxlength: 5000
    },
    tags: {
      type: [String],
      default: []
    },
    deadline: {
      type: Date
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "Open"
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", location: "text", description: "text", tags: "text" });
jobSchema.index({ recruiter: 1, createdAt: -1 });
jobSchema.index({ status: 1, employmentType: 1, workMode: 1, experienceLevel: 1, createdAt: -1 });

const Job = mongoose.model("Job", jobSchema);

export default Job;
