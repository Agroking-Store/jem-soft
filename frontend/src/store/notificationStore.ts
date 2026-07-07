import {create} from "zustand";
import {
getNotifications,
markNotificationRead
}
from "@/features/notifications/api/notificationApi";


interface NotificationState {

notifications:any[];

unreadCount:number;

fetchNotifications:()=>Promise<void>;

readNotification:(id:string)=>Promise<void>;

}



export const useNotificationStore =
create<NotificationState>((set)=>({

notifications:[],

unreadCount:0,


fetchNotifications:async()=>{


const response =
await getNotifications();


const notifications =
response.data;


set({

notifications,

unreadCount:
notifications.filter(
(n:any)=>!n.isRead
).length

});


},



readNotification:async(id:string)=>{


await markNotificationRead(id);



set((state)=>({

notifications:
state.notifications.map(n=>

n.id===id
?
{
...n,
isRead:true
}
:
n

),


unreadCount:
state.unreadCount-1

}));

}


}));