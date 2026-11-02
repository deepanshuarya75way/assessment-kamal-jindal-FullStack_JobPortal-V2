import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../constants.js";

const rescheduleRequestSchema = new mongoose.Schema(
  {
    requestedAt: {
      type: Date
    },
    preferredAt: {
      type: Date
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    status: {
      type: String,
      enum: ["None", "Pending", "Approved", "Declined"],
      default: "None"
    }
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    scheduledAt: {
      type: Date,
      required: true
    },
    stage: {
      type: String,
      enum: ["Technical", "HR", "Managerial", "Final", "Other"],
      default: "Technical"
    },
    meetingLink: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
      },
      notes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
      },
      status: {
        type: String,
        enum: ["Scheduled", "Cancelled", "Completed"],
        default: "Scheduled"
      },
      applicantResponse: {
        type: String,
        enum: ["Pending", "Confirmed", "Reschedule Requested"],
        default: "Pending"
      },
      rescheduleRequest: {
        type: rescheduleRequestSchema,
        default: () => ({})
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },
    { timestamps: true }
    );

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
        interviews: {
          type: [interviewSchema],
          default: []
        },
        withdrawnAt: {
          type: Date
        }
      },
      { timestamps: true }
    );

    applicationSchema.index(
      { student: 1, job: 1 },
      { unique: true }
    );

    applicationSchema.index({
      job: 1,
      status: 1,
      createdAt: -1
    });

    applicationSchema.index({
      "interviews.scheduledAt": 1
    });

    const Application = mongoose.model(
      "Application",
      applicationSchema);

      export default Application;