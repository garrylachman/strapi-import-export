import exportAdminController from './admin/export-controller';
import importAdminController from './admin/import-controller';
import exportContentApiController from './content-api/export-controller';
import importContentApiController from './content-api/import-controller';
declare const controllers: {
    exportAdmin: ({ strapi }: {
        strapi: any;
    }) => {
        exportData: any;
    };
    importAdmin: any;
    export: any;
    import: any;
};
export default controllers;
export { exportAdminController as exportAdmin, importAdminController as importAdmin, exportContentApiController as export, importContentApiController as import, };
