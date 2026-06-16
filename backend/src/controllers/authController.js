import * as authService from "../services/authService.js";
import { generateToken } from "../utils/generateToken.js";
import { catchAsync } from "../utils/catchAsync.js";

export const register = catchAsync(async (req, res, next) => {
  const user = await authService.registerUser(req.body);
  const token = generateToken(user._id, user.role);

  user.password = undefined;

  res.status(201).json({
    status: "success",
    token,
    data: { user },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await authService.loginUser(email, password);
  const token = generateToken(user._id, user.role);

  user.password = undefined;

  res.status(200).json({
    status: "success",
    token,
    data: { user },
  });
});
