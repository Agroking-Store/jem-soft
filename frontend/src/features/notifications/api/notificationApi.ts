import api from "@/lib/axios";


export const getNotifications = async()=>{

    const response =
        await api.get("/notifications");


    return response.data;

};



export const markNotificationRead =
async(id:string)=>{

    const response =
        await api.patch(
            `/notifications/${id}/read`
        );


    return response.data;

};