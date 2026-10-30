import { ZodError } from "zod";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => issue.message).join(" ");
        return res.status(400).json({ message: details || "Invalid request data." });
      }

      next(error);
    }
  };
};
