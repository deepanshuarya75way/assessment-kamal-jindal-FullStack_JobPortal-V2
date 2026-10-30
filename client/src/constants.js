export const employmentTypes = ["Full-time", "Part-time", "Internship", "Contract", "Remote"];

export const workModes = ["On-site", "Hybrid", "Remote"];

export const experienceLevels = ["Entry", "Junior", "Mid", "Senior", "Lead"];

export const jobStatuses = ["Open", "Closed"];

export const applicationStatuses = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

export const splitTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
