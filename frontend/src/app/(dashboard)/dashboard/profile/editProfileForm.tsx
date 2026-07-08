"use client";

import { useState,useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateProfile } from "@/features/user/user";
import type { User } from "@/features/auth/types";
import { updateUser } from "@/features/auth/authSlice";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/Button";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


export default function EditProfileForm({
  user,
}: {
  user: User;
}) {
  const dispatch = useDispatch();
  // const [form, setForm] = useState(user);
  const [loading, setLoading] = useState(false);
  const [isEditing,setIsEditing] = useState(false)

 

  const userSchema = z.object({
    name : z.string().min(1,"Name is required"),
    email : z.email("Invalid email address"),
    role : z.string().min(1,"Role is required")
  })
  

  type UserFormValues = z.infer<typeof userSchema>;

   const { reset } = useForm<UserFormValues>({
  resolver: zodResolver(userSchema),
});

useEffect(() => {
  if (user) {
    reset({
      name: user.name,
      email: user.email,
      role :user.role
    });
  }
}, [user, reset]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role : user?.role || ""
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    setLoading(true);
    //  setIsEditing(true);
    try 
    {
        const response = await updateProfile({
        name: data.name,
        email: data.email,
      });
      
      const updatedUser = response.user;
      dispatch(updateUser(updatedUser));
      // setForm(updatedUser);
      toast.success("Profile Updated successfully!");
    } 
    catch (error) 
    {
      console.error(error);
      toast.error("Failed to update profile.");
    } 
    finally {
      setLoading(false);
      setIsEditing(false);
    }

    await updateUser(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="w-80 my-5">
      <label className="block">Name</label>
        <input
        className={`w-full border rounded-lg text-sm p-2.5 transition-all
              outline-none border-slate-200 text-slate-900
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              placeholder:text-slate-400
              ${!isEditing ? "bg-slate-200 cursor-not-allowed" : "" }
              `}
         {...register("name")} 
          disabled = {!isEditing}
         />
         {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}

        <label className="block mt-5">Email</label>
        <input
        className={`w-full border rounded-lg text-sm p-2.5 transition-all
              outline-none border-slate-200 text-slate-900
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              placeholder:text-slate-400
              ${!isEditing ? "bg-slate-200 cursor-not-allowed" : "" }`}
         {...register("email")} 
        disabled = {!isEditing}
         />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}

         <label className="block mt-5">Role</label>
        <input
        className={`w-full border rounded-lg text-sm p-2.5 transition-all
              outline-none border-slate-200 text-slate-900
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              placeholder:text-slate-400
              bg-slate-200 cursor-not-allowed`}
         {...register("role")} 
        disabled = {true}
         />
      {!isEditing && (<Button
        type="button"
        disabled={isEditing}
        className="mt-5 bg-red-500 hover:bg-red-600"
        onClick={() => setIsEditing(true)}
      >
        {"Edit Profile"}

      </Button>)}
      {isEditing && ( <Button
        type="submit"
        disabled={loading}
        className="mt-5"
      >
         {loading ? "Saving..." : "Save Changes"} 
      </Button>)}
      </div>
    </form>
  );
}
