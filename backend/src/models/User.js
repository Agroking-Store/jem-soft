import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
      trim: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "ADVISOR", "CLIENT"],
      default: "CLIENT",
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
