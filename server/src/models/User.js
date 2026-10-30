import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { USER_ROLES } from "../constants.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    skills: {
      type: [String],
      default: []
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 800,
      default: ""
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    companyWebsite: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    companyDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    savedJobs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
      default: []
    }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
