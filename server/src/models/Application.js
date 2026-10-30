import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../constants.js";

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },
    resumeLink: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "Pending"
    },
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: APPLICATION_STATUSES,
            required: true
          },
          changedAt: {
            type: Date,
            default: Date.now
          },
          changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          }
        }
      ],
      default: []
    },
    withdrawnAt: {
      type: Date
    }
  },
  { timestamps: true }
);

applicationSchema.index({ student: 1, job: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });

const Application = mongoose.model("Application", applicationSchema);

export default Application;
