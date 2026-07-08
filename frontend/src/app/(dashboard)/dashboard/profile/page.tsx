"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import EditProfileForm from "./editProfileForm";

export default function UserComponent()
{
    const { user } = useAuth();

    if (!user) {
        return <div>Loading...</div>;
    }

    return(
        <>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Profile details:
             </h2>
             <EditProfileForm user={user}/>
        </>
    )
}