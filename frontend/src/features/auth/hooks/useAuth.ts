"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { loginUser, registerUser, logout, clearError } from "../authSlice";
import type { LoginPayload, RegisterPayload } from "../types";
import toast from "react-hot-toast";

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { user, token, isLoading, error } = useSelector(
    (state: RootState) => state.auth,
  );

  const isAuthenticated = !!token;

  const login = async (payload: LoginPayload) => {
    const result = await dispatch(loginUser(payload));
    if (loginUser.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.data.user.name}!`);
      router.push("/dashboard");
    } else {
      toast.error(result.payload as string);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) {
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    logout: handleLogout,
    clearError: () => dispatch(clearError()),
  };
};
