import { Schema, Struct } from '@strapi/types';
export declare function getAllSlugs({ includePluginsContentTypes }?: {
    includePluginsContentTypes?: boolean;
}): string[];
export declare function getModel(slug: any): Struct.ContentTypeSchema;
export declare function getModelFromSlugOrModel(modelOrSlug: any): any;
/**
 * Get the attributes of a model.
 */
export declare function getModelAttributes(slug: any, options?: {
    filterType?: Schema.Attribute.Kind[];
    filterOutType?: Schema.Attribute.Kind[];
    filterOutTarget?: Struct.ContentTypeSchema;
}): any[];
export declare function isComponentAttribute(attribute: any): attribute is Schema.Attribute.Component;
export declare function isDynamicZoneAttribute(attribute: any): attribute is Schema.Attribute.DynamicZone;
export declare function isMediaAttribute(attribute: any): attribute is Schema.Attribute.Media;
export declare function isRelationAttribute(attribute: any): attribute is Schema.Attribute.RelationWithTarget;
export declare function getEntryProp(entry: any, prop: any): any;
export declare function setEntryProp(entry: any, prop: any, value: any): void;
export declare function deleteEntryProp(entry: any, prop: any): void;
