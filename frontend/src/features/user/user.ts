import api from "@/lib/axios";  //axios instance 

interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export const updateProfile = async (data: UpdateProfilePayload) => {
  const response = await api.patch("/users/updateProfile", data);

  return response.data;
};