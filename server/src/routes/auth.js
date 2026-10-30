import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookies.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";

const router = express.Router();

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  headline: user.headline,
  location: user.location,
  skills: user.skills,
  bio: user.bio,
  companyName: user.companyName,
  companyWebsite: user.companyWebsite,
  companyDescription: user.companyDescription
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again in a few minutes." }
});

router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, headline, location, skills, bio, companyName, companyWebsite, companyDescription } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      headline,
      location,
      skills,
      bio,
      companyName,
      companyWebsite,
      companyDescription
    });
    const token = createToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user._id);
    setAuthCookie(res, token);

    res.json({
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out." });
});

export default router;
