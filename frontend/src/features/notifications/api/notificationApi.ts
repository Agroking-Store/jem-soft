import api from "@/lib/axios";



export const getNotifications = async () => {

    const response =
        await api.get("/notifications");


    return response.data;

};



export const markNotificationRead =
    async (id: string) => {

        const response =
            await api.patch(
                `/notifications/${id}/read`
            );


        return response.data;

    };

export const deleteNotification = async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
};



export const deleteReadNotifications = () => {
    return api.delete("/notifications/read");
};

export const markAllNotificationsRead = () => {
    return api.patch("/notifications/mark-all-read");
};