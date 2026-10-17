"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import EditProfileForm from "./editProfileForm";

export default function UserComponent() {
    const { user } = useAuth();

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="w-full">
            <EditProfileForm user={user} />
        </div>
    )
}