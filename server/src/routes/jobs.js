import express from "express";
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_STATUSES, WORK_MODES } from "../constants.js";
import { authorize, protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { createJobSchema, jobsQuerySchema, updateJobSchema } from "../validation/schemas.js";

const router = express.Router();

const compactJobPayload = (body) => ({
  ...body,
  tags: body.tags?.filter(Boolean) || [],
  deadline: body.deadline || undefined,
  salaryMin: body.salaryMin ?? undefined,
  salaryMax: body.salaryMax ?? undefined
});

const getSort = (sort, hasSearch) => {
  if (sort === "deadline") {
    return { deadline: 1, createdAt: -1 };
  }

  if (sort === "salary-high") {
    return { salaryMax: -1, salaryMin: -1, createdAt: -1 };
  }

  if (sort === "salary-low") {
    return { salaryMin: 1, salaryMax: 1, createdAt: -1 };
  }

  if (hasSearch) {
    return { score: { $meta: "textScore" }, createdAt: -1 };
  }

  return { createdAt: -1 };
};

router.get("/meta/options", (_req, res) => {
  res.json({
    employmentTypes: EMPLOYMENT_TYPES,
    workModes: WORK_MODES,
    experienceLevels: EXPERIENCE_LEVELS,
    jobStatuses: JOB_STATUSES,
    applicationStatuses: APPLICATION_STATUSES
  });
});

router.get("/", validate(jobsQuerySchema, "query"), async (req, res, next) => {
  try {
    const { search, type, workMode, experienceLevel, status, page, limit, sort } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type) {
      query.employmentType = type;
    }

    if (workMode) {
      query.workMode = workMode;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const projection = search ? { score: { $meta: "textScore" } } : {};
    const [jobs, total] = await Promise.all([
      Job.find(query, projection)
        .populate("recruiter", "name email companyName companyWebsite")
        .sort(getSort(sort, Boolean(search)))
        .skip(skip)
        .limit(limit),
      Job.countDocuments(query)
    ]);

    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/mine", protect, authorize("recruiter"), async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.get("/saved", protect, authorize("student"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedJobs",
      populate: { path: "recruiter", select: "name email companyName companyWebsite" }
    });

    res.json({ jobs: user.savedJobs || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/save", protect, authorize("student"), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedJobs: job._id } });
    res.json({ message: "Job saved." });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/save", protect, authorize("student"), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedJobs: req.params.id } });
    res.json({ message: "Saved job removed." });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "recruiter",
      "name email headline location companyName companyWebsite companyDescription"
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, authorize("recruiter"), validate(createJobSchema), async (req, res, next) => {
  try {
    const job = await Job.create({
      ...compactJobPayload(req.body),
      recruiter: req.user._id
    });

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", protect, authorize("recruiter"), validate(updateJobSchema), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own jobs." });
    }

    Object.assign(job, compactJobPayload(req.body));
    await job.save();

    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, authorize("recruiter"), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own jobs." });
    }

    await Application.deleteMany({ job: job._id });
    await User.updateMany({ savedJobs: job._id }, { $pull: { savedJobs: job._id } });
    await job.deleteOne();

    res.json({ message: "Job and related applications deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
