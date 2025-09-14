interface Alert {
    id: number;
    timeout: NodeJS.Timeout;
    variant: string;
    title: string;
    message: string;
}
export declare const useAlerts: () => {
    alerts: Alert[];
    notify: (title: string, message: string, variant?: string) => void;
    removeAlert: (id: number) => void;
};
export {};
