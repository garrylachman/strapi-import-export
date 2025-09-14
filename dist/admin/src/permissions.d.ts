interface Permission {
    action: string;
    subject: null;
}
interface PluginPermissions {
    exportButton: Permission[];
    importButton: Permission[];
    main: Permission[];
}
export declare const pluginPermissions: PluginPermissions;
export {};
