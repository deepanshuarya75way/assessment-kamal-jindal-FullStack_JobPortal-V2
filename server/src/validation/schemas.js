import { z } from "zod";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  JOB_STATUSES,
  RECRUITER_APPLICATION_STATUSES,
  USER_ROLES,
  WORK_MODES,
} from "../constants.js";

const optionalText = (max, field) =>
  z
    .string()
    .trim()
    .max(max, `${field} must be ${max} characters or fewer.`)
    .optional()
    .or(z.literal(""));

const requiredText = (max, field) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required.`)
    .max(max, `${field} must be ${max} characters or fewer.`);

const optionalUrl = (field) =>
  z
    .string()
    .trim()
    .url(`${field} must be a valid URL.`)
    .max(500, `${field} must be 500 characters or fewer.`)
    .optional()
    .or(z.literal(""));

const numberFromForm = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}, z.number().min(0, "Salary values cannot be negative.").max(100000000, "Salary value is too large.").optional());

const dateFromForm = z.preprocess(
  (value) => {
    if (!value) {
      return undefined;
    }

    return value;
  },
  z
    .string()
    .datetime("Deadline must be a valid date.")
    .optional()
    .or(z.literal("")),
);

export const registerSchema = z.object({
  name: requiredText(80, "Name"),
  email: z
    .string()
    .trim()
    .email("Email must be valid.")
    .max(160, "Email must be 160 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  role: z.enum(USER_ROLES, { message: "Role must be student or recruiter." }),
  headline: optionalText(120, "Headline"),
  location: optionalText(120, "Location"),
  skills: z
    .array(
      z.string().trim().max(40, "Each skill must be 40 characters or fewer."),
    )
    .max(20)
    .optional(),
  bio: optionalText(800, "Bio"),
  companyName: optionalText(120, "Company name"),
  companyWebsite: optionalUrl("Company website"),
  companyDescription: optionalText(1000, "Company description"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email must be valid.")
    .max(160, "Email must be 160 characters or fewer."),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
});

const jobShape = {
  title: requiredText(120, "Job title"),
  company: requiredText(120, "Company"),
  location: requiredText(120, "Location"),
  employmentType: z
    .enum(EMPLOYMENT_TYPES, { message: "Employment type is invalid." })
    .default("Full-time"),
  workMode: z
    .enum(WORK_MODES, { message: "Work mode is invalid." })
    .default("On-site"),
  experienceLevel: z
    .enum(EXPERIENCE_LEVELS, { message: "Experience level is invalid." })
    .default("Entry"),
  salary: optionalText(120, "Salary"),
  salaryMin: numberFromForm,
  salaryMax: numberFromForm,
  description: requiredText(5000, "Description"),
  requirements: requiredText(5000, "Requirements"),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
  deadline: dateFromForm,
  status: z
    .enum(JOB_STATUSES, { message: "Job status is invalid." })
    .default("Open"),
};

const baseJobSchema = z.object(jobShape);

export const createJobSchema = baseJobSchema.refine(
  (data) =>
    !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
  "Minimum salary cannot be greater than maximum salary.",
);

export const updateJobSchema = baseJobSchema
  .partial()
  .refine(
    (data) =>
      !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
    "Minimum salary cannot be greater than maximum salary.",
  );

export const jobsQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  type: z.string().trim().optional().default(""),
  workMode: z.string().trim().optional().default(""),
  experienceLevel: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default("Open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(9),
  sort: z
    .enum(["newest", "deadline", "salary-high", "salary-low"])
    .optional()
    .default("newest"),
});

export const applySchema = z.object({
  resumeLink: optionalUrl("Resume link"),
  coverLetter: optionalText(3000, "Cover letter"),
});

export const statusSchema = z.object({
  status: z.enum(RECRUITER_APPLICATION_STATUSES, {
    message: "Invalid application status.",
  }),
});

export const applicationQuerySchema = z.object({
  jobId: z.string().trim().optional().default(""),
  status: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(APPLICATION_STATUSES).optional(),
  ),
  search: z.string().trim().max(120).optional().default(""),
});
