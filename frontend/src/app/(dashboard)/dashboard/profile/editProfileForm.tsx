"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { updateProfile } from "@/features/user/user";
import type { User } from "@/features/auth/types";
import { updateUser } from "@/features/auth/authSlice";
import toast from "react-hot-toast";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";


export default function EditProfileForm({
  user,
}: {
  user: User;
}) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(user);
  const [loading, setLoading] = useState(false);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await updateProfile({
        name: form.name,
        email: form.email,
      });
      const updatedUser = response.user;
      dispatch(updateUser(updatedUser));
      setForm(updatedUser);
      toast.success("Profile Updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="w-80 my-5">
      <Input
        label="User Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        className="mb-5"
        required
      />
      <Input
        label="Email Address"
        name="email"
        value={form.email}
        onChange={handleChange}
        required
      />
      <Button
        type="submit"
        disabled={loading}
        className="mt-5"
      >
        {loading ? "Saving..." : "Save Changes"}
      </Button>
      </div>
    </form>
  );
}
