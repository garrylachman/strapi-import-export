declare const _default: {
    register: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    destroy: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    config: any;
    controllers: {
        exportAdmin: ({ strapi }: {
            strapi: any;
        }) => {
            exportData: any;
        };
        importAdmin: any;
        export: any;
        import: any;
    };
    routes: any;
    services: {
        export: any;
        import: {
            importData: any;
            importDataV2: any;
            parseInputData: any;
            isImportInProgress: () => boolean;
            setImportInProgress: (status: any) => void;
            setSSEClient: (client: any) => void;
            clearSSEClient: () => void;
            importDataV3: (fileContent: any, options: any, progressOptions: any) => Promise<import("./services/import/import-v3").ImportResult>;
        };
    };
    contentTypes: any;
    policies: {};
    middlewares: {};
};
export default _default;
