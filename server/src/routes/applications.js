import mongoose from "mongoose";
import express, { application } from "express";
import {protect, authorize} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { applicationQuerySchema, applySchema, statusSchema } from "../validation/schemas.js";

const router = express.Router();

router.post(
  "/:id/interviews",
  protect,
  authorize("recruiter"),
  async (req, res, next) => {
    try {
      const{ stageTitle, scheduledAt, meetingLink } = req.body;
      if(typeof stageTitle !== "string" || !stageTitle.trim() || !scheduledAt){
        return res.status(400).json({
          message: "Stage title and interview date are required."
        });
      }

      const interviewDate = new Date(scheduledAt);
      if(Number.isNaN(interviewDate.getTime())){
        return res.status(400).json({
          message: "Invalid interview date."
        });
      }

      if(interviewDate <= new Date()){
        return res.status(400).json({
          message: "Interview must be scheduled in the future."
        });
      } 

      if(meetingLink !== undefined && typeof meetingLink !== "string"){
        return res.status(400).json({
          message: "Meeting Link must be a string."
        });
      }

      if(stageTitle.trim().length > 150 || (meetingLink && meetingLink.length > 1000)){
        return res.status(400).json({
          message: "Interview details exceed the allowed length."
        });
      }

      const application = await Application.findById(req.params.id).populate("job");
      if(!application){
        return res.status(404).json({
          message: "Application not found."
        });
      }

      if(!application.job || String(application.job.recruiter) !== String(req.user_id)){
        return res.status(403).json({
          message: "You cannot schedule an interview for this application."
        });
      }

      if(application.status !== "Shortlisted"){
        return res.status(400).json({
          message: "Only shortlisted applicants can be schedule."
        });
      }

      application.interviews.push({
        stageTitle: stageTitle.trim(),
        scheduledAt: interviewDate,
        meetingLink: meetingLink?.trim()|| "",
        scheduledBy: req.user_id
      });

      await application.save();

      return res.status(201).json({
        message: "Interview schedule successfully.",
        interviews: application.interviews
      });
    }
    catch(error){
      next(error);
    }
  }
);

router.patch(
  "/:id/interviews/:interviewId/response",
  protect,
  authorize("student"),
  async(req, res, next) => {
    try{
      const {applicantResponse, rescheduleNote} = req.body;
      if(!["Confirmed", "Reschedule Requested"].includes(applicantResponse)){
        return res.status(400).json({
          message: "Invailed interview response."
        });
      }

      if(rescheduleNote !== undefined && typeof rescheduleNote !== "string" || rescheduleNote.length > 1000){
        return res.status(400).json({
          message: "Reschedule note must be at most 1000 characters."
        });
      }

      if(applicantResponse === "Reschedule Requested" && !rescheduleNote?.trim()){
        return res.status(400).json({
          message: "Please provide a reason for rescheduling."
        });
      }

      const application = await Application.findById(req.params.id);
      if(!application){
        return res.status(404).json({
          message: "Application not found."
        });
      }
      if(String(application.student) !== String(req.user._id)){
        return res.status(403).json({
          message: "You cannot modify another student's interview."
        });
      }

      const interview = application.interviews.id(req.params.interviewId);
      if(!interview){
        return res.status(404).json({
          message: "Interview not found."
        });
      }

      if(interview.status !== "Scheduled"){
        return res.status(400).json({
          message: "This interview is no longer active."
        });
      }

      interview.applicantResponse = applicantResponse;
      interview.rescheduleNote = applicantResponse === "Reschedule Requested" ? rescheduleNote.trim() : "";
      interview.updateAt = new Date();
      await application.save();
      return res.json({
        message: applicationResponse === "Confirmed" ? "Attendance confirmed successfully." : "Reschedule request submitted successfully.".interview
      });
    }
    catch(error){
      next(error);
    }
  }
);

router.patch(
  "/:id/interviews/:interviewId",
  protect,
  authorize("recruiter"),
  async (req, res, next) => {
    try{
      const {
        stageTitle,
        scheduleAt,
        meetingLink,
        status
      } = req.body;
      const allowedStatuses = ["Scheduled", "Cancelled", "Completed"];
      if(status !== undefined && !allowedStatuses.includes(status)){
        return res.status(400).json({
          message: "Invalid interview status."
        });
      }
      if(stageTitle !== undefined && (typeof stageTitle !== "string" || !stageTitle.trim() || stageTitle.length > 150)){
        return res.status(400).json({
          message: "Invalid interview stage title."
        });
      }
      if(meetingLink !== undefined && (typeof meetingLink !== "string" || meetingLink.length > 1000)){
        return res.status(400).json({
          message: "Invalid meeting link."
        });
      }
      
      let interviewDate;
      if(scheduleAt !== undefined){
        interviewDate = new Date(scheduleAt);
        if(Number.isNaN(interviewDate.getTime()) || interviewDate <= new Date()){
          return res.status(400).json({
            message: "Choose a valid future interview date."
          });
        }
      }

      const application = await Application.findById(req.params.id).populate("job");
      if(!application){
        return res.status(404).json({
          message: "Application not found."
        });
      }
      if(!application.job || String(application.job.recruiter) !== String(req.user._id)){
        return res.status(403).json({
          message: "You cannot manage this interview."
        });
      }

      const interview = application.interviews.id(req.params.interviewId);
      if(!interview){
        return res.status(404).json({
          message: "interview not found."
        });
      }
      if(stageTitle !== undefined){
        interview.stageTitle = stageTitle.trim();
      }
      if(scheduleAt !== undefined){
        interview.scheduleAt = interviewDate;
        interview.applicantResponse = "Pending";
        interview.rescheduleNote = "";
      }
      if(meetingLink !== undefined){
        interview.meetingLink = meetingLink.trim();
      }
      if(status !== undefined){
        interview.status = status;
        if(status === "Cancelled"){
          interview.applicantResponse = "Pending";
        }
      }

      interview.updateAt = new Date();
      await application.save();
      return res.json({
        message:"Interview updated successfully.".interview
      });
    }
    catch(error){
      next(error);
    }
  }
);

router.get(
  "/:id/interviews",
  protect,
  async (req, res, next) => {
    try{
      const application = await Application.findById(req.params.id).populate("job", "title company recruiter");
      if(!application){
        return res.status(404).json({
          message: "Application not found."
        });
      } 

      const isStudent = String(application.student) === String(req.user._id);
      const isRecruiter = application.job && String(application.job.recruiter) === String(req.user._id);

      if(!isStudent && !isRecruiter){
        return res.status(403).json({
          message: "You cannot view these interviews."
        });
      }

      const interviews = [...application.interviews].sort(a, b => new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime());
      return res.json({interviews});
    }
    catch(error){
      next(error);
    }
  }
)

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
