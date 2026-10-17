export interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    policyId?: string | null;
    createdAt: string;
    updatedAt: string;
}