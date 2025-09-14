"use strict";
const _ = require("lodash");
const Joi = require("joi");
const qs = require("qs");
const csvtojson = require("csvtojson");
const deepmerge = require("deepmerge");
const fp = require("lodash/fp");
const cloneDeep = require("lodash/cloneDeep");
const fromPairs = require("lodash/fromPairs");
const utils = require("@strapi/utils");
const fs = require("fs");
const fse = require("fs-extra");
require("lodash/last");
const trim = require("lodash/trim");
const os = require("os");
const path = require("path");
const fetch = require("node-fetch");
const isEmpty = require("lodash/isEmpty");
const omit = require("lodash/omit");
const pick = require("lodash/pick");
const castArray = require("lodash/castArray");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const ___default = /* @__PURE__ */ _interopDefault(_);
const Joi__default = /* @__PURE__ */ _interopDefault(Joi);
const qs__default = /* @__PURE__ */ _interopDefault(qs);
const csvtojson__default = /* @__PURE__ */ _interopDefault(csvtojson);
const deepmerge__default = /* @__PURE__ */ _interopDefault(deepmerge);
const cloneDeep__default = /* @__PURE__ */ _interopDefault(cloneDeep);
const fromPairs__default = /* @__PURE__ */ _interopDefault(fromPairs);
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const fse__default = /* @__PURE__ */ _interopDefault(fse);
const trim__default = /* @__PURE__ */ _interopDefault(trim);
const os__default = /* @__PURE__ */ _interopDefault(os);
const path__default = /* @__PURE__ */ _interopDefault(path);
const fetch__default = /* @__PURE__ */ _interopDefault(fetch);
const isEmpty__default = /* @__PURE__ */ _interopDefault(isEmpty);
const omit__default = /* @__PURE__ */ _interopDefault(omit);
const pick__default = /* @__PURE__ */ _interopDefault(pick);
const castArray__default = /* @__PURE__ */ _interopDefault(castArray);
const PLUGIN_ID = "strapi-import-export";
const actions = [
  {
    section: "plugins",
    displayName: "Import",
    uid: "import",
    pluginName: PLUGIN_ID
  },
  {
    section: "plugins",
    displayName: "Export",
    uid: "export",
    pluginName: PLUGIN_ID
  }
];
const bootstrap = ({ strapi: strapi2 }) => {
  strapi2.admin.services.permission.actionProvider.registerMany(actions);
};
const destroy = ({ strapi: strapi2 }) => {
};
const register = ({ strapi: strapi2 }) => {
};
const config = {
  default: {
    /**
     * Public hostname of the server.
     */
    serverPublicHostname: ""
  },
  validator: ({ serverPublicHostname } = {}) => {
    if (typeof serverPublicHostname !== "string") {
      throw new Error("serverPublicHostname has to be a string.");
    }
  }
};
const contentTypes = {};
const CustomSlugs = {
  MEDIA: "media",
  WHOLE_DB: "custom:db"
};
const CustomSlugToSlug = {
  [CustomSlugs.MEDIA]: "plugin::upload.file"
};
const pluginId = "strapi-import-export";
const getService = (serviceName) => {
  return strapi.plugin(pluginId).service(serviceName);
};
function isArraySafe(val) {
  return val && Array.isArray(val);
}
function toArray(val) {
  return isArraySafe(val) ? val : [val];
}
function extract(arr, predicate) {
  const extractedValues = arr.filter(predicate);
  arr.splice(0, arr.length, ...arr.filter((v, i, a) => !predicate(v, i, a)));
  return extractedValues;
}
function getAllSlugs({ includePluginsContentTypes = false } = {}) {
  return Array.from(strapi.db.metadata).filter(([collectionName]) => collectionName.startsWith("api::") || includePluginsContentTypes && collectionName.startsWith("plugin::")).map(([collectionName]) => collectionName);
}
function getModel(slug) {
  return strapi.getModel(slug);
}
function getModelAttributes(slug, options = {}) {
  const schema = getModel(slug);
  if (!schema) {
    return [];
  }
  const typesToKeep = options.filterType ? toArray(options.filterType) : [];
  const typesToFilterOut = options.filterOutType ? toArray(options.filterOutType) : [];
  const targetsToFilterOut = toArray(options.filterOutTarget || []);
  let attributes = Object.keys(schema.attributes).reduce((acc, key) => acc.concat({ ...schema.attributes[key], name: key }), []).filter((attr) => !typesToFilterOut.includes(attr.type)).filter((attr) => !targetsToFilterOut.includes(attr.target));
  if (typesToKeep.length) {
    attributes = attributes.filter((attr) => typesToKeep.includes(attr.type));
  }
  return attributes;
}
function isComponentAttribute(attribute) {
  return attribute.type === "component";
}
function isDynamicZoneAttribute(attribute) {
  return attribute.type === "dynamiczone";
}
function isMediaAttribute(attribute) {
  return attribute.type === "media";
}
function isRelationAttribute(attribute) {
  return attribute.type === "relation";
}
function getEntryProp(entry, prop) {
  return entry[prop];
}
function setEntryProp(entry, prop, value) {
  entry[prop] = value;
}
function deleteEntryProp(entry, prop) {
  delete entry[prop];
}
const errorCodes = {};
const errorMessages = {};
Object.keys(errorMessages).forEach(
  (k) => errorMessages[k] = ___default.default.template(errorMessages[k], {
    interpolate: /\{\s*(\S+)\s*\}/g
  })
);
class BusinessError extends Error {
  constructor(errorCodeOrMessage, interpolations) {
    const isErrorCode = !!errorCodes[errorCodeOrMessage];
    super(isErrorCode ? errorMessages[errorCodeOrMessage](interpolations) : errorCodeOrMessage);
    this.name = this.constructor.name;
    this.code = isErrorCode ? errorCodeOrMessage : "UNDEFINED";
  }
}
const checkParams = (schema, obj, options = {}) => {
  const allowUnknown = options.allowUnknown || false;
  const validation = schema.validate(obj, {
    abortEarly: false,
    allowUnknown
  });
  if (validation.error) {
    const error = validation.error.details.map((detail) => detail.message).join(", ");
    throw new BusinessError(error);
  }
  return validation.value;
};
const handleAsyncError = (fn) => async (ctx) => {
  try {
    const res = await fn(ctx);
    return res;
  } catch (err) {
    strapi.log.error(err);
    if (err instanceof BusinessError) {
      ctx.status = 400;
      ctx.body = {
        message: err.message,
        code: err.code
      };
    } else {
      throw err;
    }
  }
};
const exportData$2 = async (ctx) => {
  if (!hasPermissions$1(ctx)) {
    return ctx.forbidden();
  }
  let data;
  const { data: dataRaw } = ctx.request.body;
  const {
    slug,
    search,
    applySearch,
    exportFormat,
    relationsAsId,
    deepness = 5,
    exportPluginsContentTypes,
    documentIds,
    exportAllLocales = false,
    exportRelations = false,
    deepPopulateRelations = false,
    deepPopulateComponentRelations = false
  } = dataRaw;
  console.log("exportFormat", exportFormat);
  try {
    if (exportFormat === getService("export").formats.JSON_V3) {
      console.log("exportDataV3");
      data = await getService("export").exportDataV3({
        slug,
        search,
        applySearch,
        exportPluginsContentTypes,
        documentIds,
        maxDepth: deepness,
        exportAllLocales,
        exportRelations,
        deepPopulateRelations,
        deepPopulateComponentRelations
      });
    } else if (exportFormat === getService("export").formats.JSON_V2) {
      console.log("exportDataV2");
      data = await getService("export").exportDataV2({ slug, search, applySearch, deepness, exportPluginsContentTypes });
    } else {
      console.log("exportData");
      data = await getService("export").exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness });
    }
    ctx.body = {
      data
    };
  } catch (error) {
    console.log("error", error);
    if (error.message.includes("IdField not found in model")) {
      ctx.preconditionFailed(error.message, {
        cause: "IdField Not Found"
      });
    } else if (error.message.includes("IdField misconfigured in model")) {
      ctx.preconditionFailed(error.message, {
        cause: "IdField Configuration Error"
      });
    } else {
      ctx.badRequest(error.message);
    }
  }
};
const hasPermissions$1 = (ctx) => {
  const { data } = ctx.request.body;
  const { slug } = data;
  const { userAbility } = ctx.state;
  const slugs = slug === CustomSlugs.WHOLE_DB ? getAllSlugs() : [slug];
  const allowedSlugs = slugs.filter((slug2) => {
    const permissionChecker = strapi.plugin("content-manager").service("permission-checker").create({ userAbility, model: slug2 });
    return permissionChecker.can.read();
  });
  return !!allowedSlugs.length;
};
const exportAdminController = ({ strapi: strapi2 }) => ({
  exportData: handleAsyncError(exportData$2)
});
const getModelAttributesEndpoint = async (ctx) => {
  const { slug } = ctx.params;
  const attributeNames = getModelAttributes(slug).filter(filterAttribute).map((attr) => attr.name);
  attributeNames.unshift("id");
  ctx.body = {
    data: {
      attribute_names: attributeNames
    }
  };
};
const filterAttribute = (attr) => {
  const filters = [filterType, filterName];
  return filters.every((filter) => filter(attr));
};
const filterType = (attr) => !["relation", "component", "dynamiczone"].includes(attr.type);
const filterName = (attr) => !["createdAt", "updatedAt", "publishedAt", "locale"].includes(attr.name);
const getModelAttributesFunc = ({ strapi: strapi2 }) => getModelAttributesEndpoint;
const importDataFunc = ({ strapi: strapi2 }) => importData$3;
async function importData$3(ctx) {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }
  const { user } = ctx.state;
  const { data } = ctx.request.body;
  const {
    slug,
    data: dataRaw,
    format,
    idField,
    existingAction,
    ignoreMissingRelations,
    allowLocaleUpdates,
    disallowNewRelations
  } = data;
  let fileContent;
  try {
    fileContent = await getService("import").parseInputData(format, dataRaw, { slug });
  } catch (error) {
    ctx.body = {
      errors: [{
        error: error.message,
        data: {
          entry: dataRaw,
          path: ""
        }
      }]
    };
    return;
  }
  const importService2 = getService("import");
  if (fileContent?.version === 3 && importService2.isImportInProgress()) {
    ctx.body = {
      status: "error",
      message: "An import is already in progress"
    };
    ctx.status = 409;
    return;
  }
  let res;
  if (fileContent?.version === 3) {
    res = await importService2.importDataV3(fileContent, {
      slug,
      user,
      existingAction,
      ignoreMissingRelations,
      allowLocaleUpdates,
      disallowNewRelations
    }, { useSSE: true });
    if (res.backgroundProcessing) {
      ctx.body = {
        status: "started",
        useSSE: true
      };
      return;
    }
  } else if (fileContent?.version === 2) {
    res = await importService2.importDataV2(fileContent, {
      slug,
      user,
      idField
    });
  } else {
    res = await importService2.importData(dataRaw, {
      slug,
      format,
      user,
      idField
    });
  }
  ctx.body = {
    failures: res.failures || [],
    errors: res.errors || []
  };
}
function hasPermissions(ctx) {
  const { data } = ctx.request.body;
  const { slug } = data;
  const { userAbility } = ctx.state;
  let slugsToCheck = [];
  if (slug === CustomSlugs.WHOLE_DB) {
    slugsToCheck.push(...getAllSlugs());
  } else {
    slugsToCheck.push(slug);
  }
  return slugsToCheck.every((slug2) => hasPermissionForSlug(userAbility, slug2));
}
function hasPermissionForSlug(userAbility, slug) {
  const permissionChecker = strapi.plugin("content-manager").service("permission-checker").create({ userAbility, model: slug });
  return permissionChecker.can.create() && permissionChecker.can.update();
}
const importSSE$2 = async (ctx) => {
  ctx.status = 200;
  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  ctx.req.socket.setTimeout(0);
  const sseClient = {
    send: (event, data) => {
      ctx.res.write(`event: ${event}
`);
      ctx.res.write(`data: ${JSON.stringify(data)}

`);
      ctx.res.flush && ctx.res.flush();
    }
  };
  const importService2 = getService("import");
  importService2.setSSEClient(sseClient);
  ctx.req.on("close", () => {
    importService2.clearSSEClient();
  });
  sseClient.send("connected", { message: "SSE connection established" });
  return new Promise(() => {
  });
};
const importSSEFunc = ({ strapi: strapi2 }) => importSSE$2;
const importController = ({ strapi: strapi2 }) => ({
  getModelAttributes: getModelAttributesFunc({ strapi: strapi2 }),
  importData: importDataFunc({ strapi: strapi2 }),
  importSSE: importSSEFunc({ strapi: strapi2 })
});
function buildFilterQuery$2(search = "") {
  const parsed = qs__default.default.parse(search);
  const { filters, sort: sortRaw } = parsed;
  let sort = {};
  if (typeof sortRaw === "string") {
    const [attr, value] = sortRaw.split(":");
    if (attr && value) {
      sort[attr] = value.toLowerCase();
    }
  }
  return {
    filters,
    sort
  };
}
class ExportContext {
  constructor(options, exportedData = {}, processedRelations = {}) {
    this.options = options;
    this.exportedData = exportedData;
    this.processedRelations = processedRelations;
    this.processedDocumentIds = /* @__PURE__ */ new Set();
    this.relations = {};
  }
  recordProcessed(documentId) {
    this.processedDocumentIds.add(documentId);
  }
  wasProcessed(documentId) {
    return this.processedDocumentIds.has(documentId);
  }
  addRelation(contentType, documentId) {
    if (!this.relations[contentType]) {
      this.relations[contentType] = [];
    }
    if (!this.relations[contentType].includes(documentId)) {
      this.relations[contentType].push(documentId);
    }
  }
  getRelations() {
    return this.relations;
  }
  clearRelations() {
    this.relations = {};
  }
  setSkipRelations(skip) {
    this.options.skipRelations = skip;
  }
  setSkipComponentRelations(skip) {
    this.options.skipComponentRelations = skip;
  }
  setDocumentIds(documentIds) {
    this.options.documentIds = documentIds;
  }
}
function buildComponentPopulate(componentModel, depth = 5, path2 = "") {
  if (depth < 1) return true;
  const componentPopulate = {};
  for (const [attrName, attrDef] of Object.entries(componentModel.attributes)) {
    if (!attrDef) continue;
    const currentPath = path2 ? `${path2}.${attrName}` : attrName;
    if (isRelationAttribute(attrDef)) {
      componentPopulate[attrName] = true;
    } else if (isMediaAttribute(attrDef)) {
      componentPopulate[attrName] = true;
    } else if (isComponentAttribute(attrDef)) {
      const nestedComponentModel = getModel(attrDef.component);
      const nestedPopulate = buildComponentPopulate(nestedComponentModel, 1, currentPath);
      if (nestedPopulate === true) {
        componentPopulate[attrName] = true;
      } else {
        componentPopulate[attrName] = { populate: nestedPopulate };
      }
    } else if (isDynamicZoneAttribute(attrDef)) {
      const dynamicZonePopulate = {};
      for (const componentName of attrDef.components) {
        const dzComponentModel = getModel(componentName);
        const dzComponentPopulate = buildComponentPopulate(dzComponentModel, depth - 1, `${currentPath}.__component`);
        if (dzComponentPopulate !== true) {
          Object.assign(dynamicZonePopulate, dzComponentPopulate);
        }
      }
      componentPopulate[attrName] = Object.keys(dynamicZonePopulate).length > 0 ? { populate: dynamicZonePopulate } : true;
    }
  }
  return componentPopulate;
}
function buildDynamicZonePopulate(attr, depth = 5, path2 = "") {
  const populate = {
    on: {}
  };
  for (const componentName of attr.components) {
    const componentModel = getModel(componentName);
    console.log(`Building populate for dynamic zone component: ${componentName}`);
    const componentPopulate = buildComponentPopulate(componentModel, depth - 1, path2);
    populate.on[componentName] = componentPopulate === true ? { populate: "*" } : { populate: componentPopulate };
  }
  return populate;
}
function buildPopulateForModel(slug, depth = 5) {
  console.log(`Building populate for ${slug} at depth ${depth}`);
  if (depth < 1) {
    console.log(`Max depth reached for ${slug}`);
    return true;
  }
  const model = getModel(slug);
  if (!model) {
    console.log(`No model found for ${slug}`);
    return true;
  }
  const populate = {};
  for (const [attrName, attrDef] of Object.entries(model.attributes)) {
    if (!attrDef) continue;
    if (isRelationAttribute(attrDef) || isComponentAttribute(attrDef) || isDynamicZoneAttribute(attrDef) || isMediaAttribute(attrDef)) {
      console.log(`Found special attribute ${attrName} of type ${attrDef.type}`);
      if (isComponentAttribute(attrDef)) {
        console.log(`Building nested populate for component ${attrDef.component}`);
        const componentModel = getModel(attrDef.component);
        const componentPopulate = buildComponentPopulate(componentModel, depth - 1, attrName);
        populate[attrName] = componentPopulate === true ? true : { populate: componentPopulate };
      } else if (isDynamicZoneAttribute(attrDef)) {
        console.log(`Building dynamic zone populate for ${attrName}`);
        populate[attrName] = buildDynamicZonePopulate(attrDef, depth - 1, attrName);
      } else if (isRelationAttribute(attrDef)) {
        populate[attrName] = true;
      } else if (isMediaAttribute(attrDef)) {
        populate[attrName] = true;
      }
    }
  }
  console.log(`Populate object for ${slug}:`, JSON.stringify(populate, null, 2));
  return populate;
}
function attributeIsUnique$1(attribute) {
  return ["string", "text", "email", "integer", "biginteger", "float", "decimal"].includes(attribute.type);
}
function getIdentifierField(model) {
  console.log("getIdentifierField for model:", model.uid);
  const importExportOptions = model.pluginOptions?.[pluginId];
  if (importExportOptions?.idField) {
    const configuredField = importExportOptions.idField;
    console.log("Using configured idField:", configuredField);
    const attribute = model.attributes[configuredField];
    if (!attribute) {
      throw new Error(`Configured idField '${configuredField}' not found in model '${model.uid}'`);
    }
    if (attributeIsUnique$1(attribute) && (!attribute.required || !attribute.unique)) {
      throw new Error(
        `Configured idField '${configuredField}' in model '${model.uid}' must be both required and unique. Current settings - required: ${!!attribute.required}, unique: ${!!attribute.unique}`
      );
    }
    return configuredField;
  }
  const attributes = model.attributes || {};
  console.log("Looking for identifier in attributes:", Object.keys(attributes));
  if (attributes.uid) return "uid";
  if (attributes.name) return "name";
  if (attributes.title) return "title";
  console.log("Falling back to id");
  return "id";
}
function validateIdField(model) {
  const idField = getIdentifierField(model);
  const attribute = model.attributes[idField];
  if (!attribute) {
    throw new Error(`IdField not found in model: Field '${idField}' is missing from model '${model.uid}'`);
  }
  if (!attributeIsUnique$1(attribute) && attribute.type !== "uid") {
    throw new Error(
      `IdField type not supported in model: Field '${idField}' in model '${model.uid}' must have a unique option. Current settings - type: ${attribute.type}`
    );
  }
  if (attributeIsUnique$1(attribute) && (!attribute.required || !attribute.unique) || attribute.type === "uid" && !attribute.required) {
    throw new Error(
      `IdField misconfigured in model: Field '${idField}' in model '${model.uid}' must be ${attribute.type === "uid" ? "required" : "both required and unique"}. Current settings - required: ${!!attribute.required}${attribute.type !== "uid" ? `, unique: ${!!attribute.unique}` : "true"}`
    );
  }
  return idField;
}
const getConfig = (param) => {
  return strapi.config.get(`plugin.${pluginId}.${param}`);
};
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2["DEBUG"] = "debug";
  LogLevel2["INFO"] = "info";
  LogLevel2["WARN"] = "warn";
  LogLevel2["ERROR"] = "error";
  return LogLevel2;
})(LogLevel || {});
class Logger {
  constructor() {
    this.currentLogLevel = "info";
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
      const logLevel = Object.values(LogLevel).includes(getConfig("logLevel")) ? getConfig("logLevel") : "debug";
      console.log(`Setting log level to ${logLevel}`);
      Logger.instance.setLogLevel(logLevel);
    }
    return Logger.instance;
  }
  setLogLevel(level) {
    this.currentLogLevel = level;
  }
  shouldLog(level) {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.currentLogLevel);
  }
  formatMessage(message, context) {
    if (!context) return message;
    const contextParts = [];
    if (context.operation) contextParts.push(`[${context.operation}]`);
    if (context.contentType) contextParts.push(`[${context.contentType}]`);
    if (context.documentId) contextParts.push(`[${context.documentId}]`);
    if (context.path) contextParts.push(`[${context.path.join(".")}]`);
    Object.entries(context).forEach(([key, value]) => {
      if (!["operation", "contentType", "documentId", "path"].includes(key)) {
        contextParts.push(`[${key}:${value}]`);
      }
    });
    return `${contextParts.join(" ")} ${message}`;
  }
  log(level, message, context, error) {
    if (!this.shouldLog(level)) return;
    const formattedMessage = this.formatMessage(message, context);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    switch (level) {
      case "debug":
        console.debug(`[${timestamp}] 🔍 DEBUG:`, formattedMessage);
        if (error) console.debug(error);
        break;
      case "info":
        console.info(`[${timestamp}] ℹ️ INFO:`, formattedMessage);
        if (error) console.info(error);
        break;
      case "warn":
        console.warn(`[${timestamp}] ⚠️ WARN:`, formattedMessage);
        if (error) console.warn(error);
        break;
      case "error":
        console.error(`[${timestamp}] ❌ ERROR:`, formattedMessage);
        if (error) console.error(error);
        break;
    }
  }
  debug(message, context, error) {
    this.log("debug", message, context, error);
  }
  info(message, context, error) {
    this.log("info", message, context, error);
  }
  warn(message, context, error) {
    this.log("warn", message, context, error);
  }
  error(message, context, error) {
    this.log("error", message, context, error);
  }
}
const logger = Logger.getInstance();
class ExportProcessor {
  constructor(context, services2) {
    this.context = context;
    this.services = services2;
  }
  async processSchema(currentSlug) {
    const context = {
      operation: "export",
      contentType: currentSlug
    };
    const model = getModel(currentSlug);
    if (!model || model.uid === "admin::user") {
      logger.debug(`Skipping model`, context);
      return;
    }
    try {
      if (model.kind !== "singleType") {
        validateIdField(model);
      }
    } catch (error) {
      logger.error("ID field validation failed", context, error);
      throw error;
    }
    logger.debug("Processing schema", context);
    const populate = buildPopulateForModel(currentSlug);
    if (!this.context.exportedData[currentSlug]) {
      this.context.exportedData[currentSlug] = [];
    }
    const documentIdFilter = this.context.options.documentIds?.length ? {
      documentId: { $in: this.context.options.documentIds }
    } : {};
    const searchParams = this.context.options.applySearch && this.context.options.search ? typeof this.context.options.search === "string" ? JSON.parse(this.context.options.search) : this.context.options.search : {};
    const filtersAndDocs = {
      filters: {
        ...searchParams.filters,
        ...documentIdFilter
      },
      ...this.context.options.applySearch && searchParams.sort && { sort: searchParams.sort }
    };
    console.log("FILTERS AND DOCS", JSON.stringify(filtersAndDocs, null, 2));
    const draftEntries = await this.services.documents(currentSlug).findMany({
      ...filtersAndDocs,
      status: "draft",
      populate: {
        ...populate,
        ...this.context.options.exportAllLocales && {
          localizations: {
            populate
          }
        }
      }
    });
    console.log("DRAFT ENTRIES", JSON.stringify(draftEntries, null, 2));
    logger.debug(`Found ${draftEntries.length} draft entries`, context);
    for (const draftEntry of draftEntries) {
      await this.processEntry(currentSlug, draftEntry, model, populate);
    }
  }
  async processEntry(contentType, draftEntry, model, populate) {
    const context = {
      operation: "export",
      contentType,
      documentId: draftEntry.documentId
    };
    try {
      const publishedEntry = await this.services.documents(contentType).findOne({
        documentId: draftEntry.documentId,
        status: "published",
        populate: {
          ...populate,
          ...this.context.options.exportAllLocales && {
            localizations: {
              populate
            }
          }
        }
      });
      const versions = this.groupByLocale(draftEntry, publishedEntry, model);
      if (versions.draft || versions.published) {
        this.context.exportedData[contentType].push(versions);
        this.context.recordProcessed(draftEntry.documentId);
      }
    } catch (error) {
      logger.error("Failed to process entry", context, error);
      throw error;
    }
  }
  groupByLocale(entry, publishedEntry, model) {
    const result = {};
    const processEntry = (data) => {
      const processed = this.processDataWithSchema(data, model, {
        processLocalizations: true
      });
      delete processed.localizations;
      return processed;
    };
    const draftData = processEntry(entry);
    const publishedData = publishedEntry ? processEntry(publishedEntry) : null;
    if (!publishedData || !this.areVersionsEqual(draftData, publishedData)) {
      result.draft = { default: draftData };
    }
    if (this.context.options.exportAllLocales && entry.localizations?.length) {
      for (const draftLoc of entry.localizations) {
        const locale = draftLoc.locale;
        if (!locale) continue;
        const publishedLoc = publishedEntry?.localizations?.find((l) => l.locale === locale);
        const draftLocData = processEntry(draftLoc);
        const publishedLocData = publishedLoc ? processEntry(publishedLoc) : null;
        if (!publishedLocData || !this.areVersionsEqual(draftLocData, publishedLocData)) {
          if (!result.draft) result.draft = {};
          result.draft[locale] = draftLocData;
        }
      }
    }
    if (publishedEntry) {
      result.published = { default: processEntry(publishedEntry) };
      if (this.context.options.exportAllLocales && publishedEntry.localizations?.length) {
        for (const publishedLoc of publishedEntry.localizations) {
          const locale = publishedLoc.locale;
          if (!locale) continue;
          result.published[locale] = processEntry(publishedLoc);
        }
      }
    }
    return result;
  }
  processDataWithSchema(data, schema, options = {
    processLocalizations: true
  }, skipRelationsOverride = null) {
    if (!data) return null;
    const processed = { ...data };
    delete processed.id;
    delete processed.documentId;
    delete processed.createdBy;
    delete processed.updatedBy;
    if (!options.processLocalizations) {
      delete processed.localizations;
    }
    for (const [key, attr] of Object.entries(schema.attributes)) {
      if (data[key] === void 0 || data[key] === null) continue;
      if (key === "localizations" && options.processLocalizations) {
        processed[key] = data[key]?.map(
          (localization) => ({ ...this.processDataWithSchema(localization, schema, { processLocalizations: false }), documentId: localization.documentId })
        ) || [];
        continue;
      }
      try {
        if (isRelationAttribute(attr)) {
          console.log("PROCESSING RELATION", attr);
          processed[key] = this.processRelation(data[key], attr.target, attr, skipRelationsOverride);
        } else if (isComponentAttribute(attr)) {
          if (attr.repeatable) {
            processed[key] = data[key]?.map(
              (item) => this.processComponent(item, attr.component)
            ) || [];
          } else {
            processed[key] = this.processComponent(data[key], attr.component);
          }
        } else if (isDynamicZoneAttribute(attr)) {
          processed[key] = this.processDynamicZone(data[key]);
        } else if (isMediaAttribute(attr)) {
          processed[key] = this.processMedia(data[key], attr);
        }
      } catch (error) {
        logger.error(`Failed to process attribute`, {
          operation: "export",
          attribute: key,
          contentType: schema.uid
        }, error);
        processed[key] = null;
      }
    }
    return processed;
  }
  processRelation(item, targetModelUid, attr, skipRelationsOverride = null) {
    if (!item) return null;
    if (Array.isArray(item) && item.length === 0) return [];
    const targetModel = getModel(targetModelUid);
    if (!targetModel || targetModel.uid === "admin::user") return null;
    const idField = getIdentifierField(targetModel);
    const skipRelations = skipRelationsOverride ?? this.context.options.skipRelations;
    if (attr.relation.endsWith("Many") || attr.relation === "manyWay") {
      if (!Array.isArray(item)) {
        logger.warn("Expected array for many relation", { targetModelUid });
        return [];
      }
      return item.map((relItem) => {
        if (!skipRelations && !this.context.wasProcessed(relItem.documentId)) {
          this.context.addRelation(targetModelUid, relItem.documentId);
        }
        return relItem[idField];
      });
    } else {
      if (Array.isArray(item)) {
        logger.warn("Expected single item for one relation", { targetModelUid });
        return null;
      }
      if (!skipRelations && !this.context.wasProcessed(item.documentId)) {
        this.context.addRelation(targetModelUid, item.documentId);
      }
      return item[idField];
    }
  }
  processComponent(item, componentUid) {
    if (!item) return null;
    const componentModel = getModel(componentUid);
    if (!componentModel) return null;
    return this.processDataWithSchema(item, componentModel, {
      processLocalizations: this.context.options.exportAllLocales
    }, this.context.options.skipComponentRelations);
  }
  processDynamicZone(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const componentModel = getModel(item.__component);
      if (!componentModel) return null;
      return {
        __component: item.__component,
        ...this.processDataWithSchema(item, componentModel, {
          processLocalizations: this.context.options.exportAllLocales
        }, this.context.options.skipComponentRelations)
      };
    }).filter(Boolean);
  }
  processMedia(item, attr) {
    if (!item) return null;
    const processMediaItem = (mediaItem) => ({
      url: mediaItem.url.startsWith("/") ? this.computeUrl(mediaItem.url) : mediaItem.url,
      name: mediaItem.name,
      caption: mediaItem.caption,
      hash: mediaItem.hash,
      alternativeText: mediaItem.alternativeText,
      createdAt: mediaItem.createdAt,
      updatedAt: mediaItem.updatedAt,
      publishedAt: mediaItem.publishedAt
    });
    if (attr.multiple) {
      return Array.isArray(item) ? item.map(processMediaItem) : [];
    }
    return processMediaItem(item);
  }
  computeUrl(relativeUrl) {
    return getConfig("serverPublicHostname") + relativeUrl;
  }
  areVersionsEqual(version1, version2, excludeFields = ["publishedAt"]) {
    const v1 = { ...version1 };
    const v2 = { ...version2 };
    excludeFields.forEach((field) => {
      delete v1[field];
      delete v2[field];
    });
    return JSON.stringify(v1) === JSON.stringify(v2);
  }
  getExportData() {
    return JSON.stringify({
      version: 3,
      data: this.context.exportedData
    }, null, "	");
  }
}
async function exportDataV3({
  slug,
  search,
  applySearch,
  exportPluginsContentTypes,
  documentIds,
  maxDepth = 20,
  exportAllLocales = true,
  exportRelations = false,
  deepPopulateRelations = false,
  deepPopulateComponentRelations = false
}) {
  const slugsToExport = slug === CustomSlugs.WHOLE_DB ? getAllSlugs({ includePluginsContentTypes: exportPluginsContentTypes }) : [CustomSlugToSlug[slug] || slug];
  const searchParams = applySearch ? buildFilterQuery$2(search) : {};
  const context = new ExportContext({
    documentIds,
    applySearch,
    search: searchParams,
    exportAllLocales,
    exportRelations,
    skipRelations: false,
    skipComponentRelations: false
  });
  console.log("Skip relations", deepPopulateRelations === false, deepPopulateComponentRelations === false);
  const processor = new ExportProcessor(context, {
    documents: strapi.documents
  });
  for (const currentSlug of slugsToExport) {
    await processor.processSchema(currentSlug);
  }
  console.log("FIRST RELATIONS:", context.getRelations());
  context.setSkipRelations(deepPopulateRelations === false);
  context.setSkipComponentRelations(deepPopulateComponentRelations === false);
  let loopCount = 0;
  while (Object.keys(context.getRelations()).length > 0 && exportRelations && loopCount < maxDepth) {
    const nextRelations = context.getRelations();
    context.clearRelations();
    for (const [key, documentIds2] of Object.entries(nextRelations)) {
      console.log("PROCESSING RELATIONS FOR", key);
      console.log("DOCUMENT IDS", documentIds2);
      context.setDocumentIds(documentIds2);
      await processor.processSchema(key);
    }
    context.processedRelations[loopCount] = nextRelations;
    loopCount++;
  }
  return JSON.stringify({
    version: 3,
    data: context.exportedData
  }, null, "	");
}
const bodySchema$1 = Joi__default.default.object({
  slug: Joi__default.default.string().required(),
  exportFormat: Joi__default.default.string().valid("csv", "json", "json-v2", "json-v3").required(),
  search: Joi__default.default.string().default(""),
  applySearch: Joi__default.default.boolean().default(false),
  relationsAsId: Joi__default.default.boolean().default(false),
  deepness: Joi__default.default.number().integer().min(1).default(5),
  exportPluginsContentTypes: Joi__default.default.boolean().default(false),
  documentIds: Joi__default.default.array().items(Joi__default.default.number()).default([]),
  exportAllLocales: Joi__default.default.boolean().default(false),
  exportRelations: Joi__default.default.boolean().default(false),
  deepPopulateRelations: Joi__default.default.boolean().default(false),
  deepPopulateComponentRelations: Joi__default.default.boolean().default(false)
});
const exportData$1 = async (ctx) => {
  let {
    slug,
    search,
    applySearch,
    exportFormat,
    relationsAsId,
    deepness,
    exportPluginsContentTypes,
    documentIds,
    exportAllLocales,
    exportRelations,
    deepPopulateRelations,
    deepPopulateComponentRelations
  } = checkParams(bodySchema$1, ctx.request.body);
  let data;
  try {
    if (exportFormat === "json-v3") {
      data = await getService("export").exportDataV3({
        slug,
        search,
        applySearch,
        exportPluginsContentTypes,
        documentIds,
        maxDepth: deepness,
        exportAllLocales,
        exportRelations,
        deepPopulateRelations,
        deepPopulateComponentRelations
      });
    } else if (exportFormat === "json-v2") {
      data = await getService("export").exportDataV2({ slug, search, applySearch, deepness, exportPluginsContentTypes });
    } else {
      data = await getService("export").exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness });
    }
    ctx.body = {
      data
    };
  } catch (error) {
    if (error.message.includes("must be both required and unique")) {
      return ctx.preconditionFailed({
        error: "IdField Configuration Error"
        // message: error.message
      });
    }
    throw error;
  }
};
const exportContentApiController = ({ strapi: strapi2 }) => ({
  exportData: handleAsyncError(exportData$1)
});
class ObjectBuilder {
  constructor() {
    this._obj = {};
  }
  get() {
    return this._obj;
  }
  extend(obj) {
    if (isObjectSafe(obj)) {
      this._obj = { ...this._obj, ...obj };
    }
  }
}
const isObjectSafe = (val) => {
  return val && !Array.isArray(val) && typeof val === "object";
};
const mergeObjects = (x, y) => {
  return deepmerge__default.default(x, y, {
    arrayMerge: (target, source) => {
      source.forEach((item) => {
        if (target.indexOf(item) === -1) {
          target.push(item);
        }
      });
      return target;
    }
  });
};
const inputFormatToParser = {
  csv: parseCsv,
  jso: parseJso,
  json: parseJson
};
const InputFormats = Object.keys(inputFormatToParser);
async function parseInputData(format, dataRaw, { slug }) {
  const parser = inputFormatToParser[format];
  if (!parser) {
    throw new Error(`Data input format ${format} is not supported.`);
  }
  const data = await parser(dataRaw, { slug });
  return data;
}
async function parseCsv(dataRaw, { slug }) {
  let data = await csvtojson__default.default().fromString(dataRaw);
  const relationNames = getModelAttributes(slug, { filterType: ["component", "dynamiczone", "media", "relation"] }).map((a) => a.name);
  data = data.map((datum) => {
    for (let name of relationNames) {
      try {
        datum[name] = JSON.parse(datum[name]);
      } catch (err) {
        strapi.log.error(err);
      }
    }
    return datum;
  });
  return data;
}
async function parseJson(dataRaw) {
  try {
    let data = JSON.parse(dataRaw);
    return data;
  } catch (err) {
    throw new Error(`Failed to parse JSON data: ${err.message}`);
  }
}
async function parseJso(dataRaw) {
  if (!isObjectSafe(dataRaw) && !isArraySafe(dataRaw)) {
    throw new Error(`To import JSO, data must be an array or an object`);
  }
  return dataRaw;
}
const bodySchema = Joi__default.default.object({
  slug: Joi__default.default.string().required(),
  data: Joi__default.default.any().required(),
  format: Joi__default.default.string().valid(...InputFormats).required(),
  idField: Joi__default.default.string(),
  existingAction: Joi__default.default.string(),
  ignoreMissingRelations: Joi__default.default.boolean().default(false),
  allowLocaleUpdates: Joi__default.default.boolean().default(false),
  disallowNewRelations: Joi__default.default.boolean().default(false)
});
const importData$1 = async (ctx) => {
  const { user } = ctx.state;
  const {
    slug,
    data: dataRaw,
    format,
    idField,
    existingAction,
    ignoreMissingRelations,
    allowLocaleUpdates,
    disallowNewRelations
  } = checkParams(bodySchema, ctx.request.body);
  let fileContent;
  try {
    fileContent = await getService("import").parseInputData(format, dataRaw, { slug });
  } catch (error) {
    ctx.body = {
      errors: [{
        error: error.message,
        data: {
          entry: dataRaw,
          path: ""
        }
      }]
    };
    return;
  }
  let res;
  const importService2 = getService("import");
  if (fileContent?.version === 3) {
    if (importService2.isImportInProgress()) {
      ctx.body = {
        status: "error",
        message: "An import is already in progress"
      };
      ctx.status = 409;
      return;
    }
    res = await importService2.importDataV3(fileContent, {
      slug,
      user,
      existingAction,
      ignoreMissingRelations,
      allowLocaleUpdates,
      disallowNewRelations
    }, { useSSE: true });
    if (res.backgroundProcessing) {
      ctx.body = {
        status: "started",
        useSSE: true
      };
      return;
    }
  } else if (fileContent?.version === 2) {
    res = await importService2.importDataV2(fileContent, {
      slug,
      user,
      idField
    });
  } else {
    res = await importService2.importData(dataRaw, {
      slug,
      format,
      user,
      idField
    });
  }
  ctx.body = {
    failures: res.failures || [],
    errors: res.errors || []
  };
};
const importData$2 = ({ strapi: strapi2 }) => handleAsyncError(importData$1);
const importSSE = async (ctx) => {
  ctx.status = 200;
  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  ctx.req.socket.setTimeout(0);
  const sseClient = {
    send: (event, data) => {
      ctx.res.write(`event: ${event}
`);
      ctx.res.write(`data: ${JSON.stringify(data)}

`);
      ctx.res.flush && ctx.res.flush();
    }
  };
  const importService2 = getService("import");
  importService2.setSSEClient(sseClient);
  ctx.req.on("close", () => {
    importService2.clearSSEClient();
  });
  sseClient.send("connected", { message: "SSE connection established" });
  return new Promise(() => {
  });
};
const importSSE$1 = ({ strapi: strapi2 }) => importSSE;
const importContentApiController = ({ strapi: strapi2 }) => ({
  importData: importData$2({ strapi: strapi2 }),
  importSSE: importSSE$1({ strapi: strapi2 })
});
const controllers = {
  exportAdmin: exportAdminController,
  importAdmin: importController,
  export: exportContentApiController,
  import: importContentApiController
};
const middlewares = {};
const policies = {};
const exportAdminRoutes = {
  type: "admin",
  routes: [
    {
      method: "POST",
      path: "/export/contentTypes",
      handler: "exportAdmin.exportData",
      config: {
        policies: []
      }
    }
  ]
};
const importAdminRoutes = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/import/model-attributes/:slug",
      handler: "importAdmin.getModelAttributes",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/import",
      handler: "importAdmin.importData",
      config: {
        policies: []
      }
    },
    {
      method: "GET",
      path: "/import/progress",
      handler: "importAdmin.importSSE",
      config: {
        policies: []
      }
    }
  ]
};
const exportContentApiRoutes = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/content/export/contentTypes",
      handler: "export.exportData",
      config: {
        policies: []
      }
    }
  ]
};
const importContentApiRoutes = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/content/import",
      handler: "import.importData",
      config: {
        policies: []
      }
    },
    {
      method: "GET",
      path: "/content/import/progress",
      handler: "import.importSSE",
      config: {
        policies: []
      }
    }
  ]
};
const routes = {
  exportAdminRoutes,
  importAdminRoutes,
  export: exportContentApiRoutes,
  import: importContentApiRoutes
};
const convertToCsv = (entries, options) => {
  entries = toArray(entries);
  const columnTitles = ["id"].concat(getModelAttributes(options.slug, { filterOutTarget: ["admin::user"] }).map((attr) => attr.name));
  const content = [convertStrArrayToCsv(columnTitles)].concat(entries.map((entry) => convertEntryToStrArray(entry, columnTitles)).map(convertStrArrayToCsv)).join("\r\n");
  return content;
};
const convertStrArrayToCsv = (entry) => {
  return entry.map(stringifyEntry).map((v) => v.replace(/"/g, '""')).map((v) => `"${v}"`).join(",");
};
const stringifyEntry = (entry) => {
  if (typeof entry === "object") {
    return JSON.stringify(entry);
  }
  return String(entry);
};
const convertEntryToStrArray = (entry, keys) => {
  return keys.map((key) => entry[key]);
};
const convertToJson$1 = (entries, options) => {
  entries = JSON.stringify(entries, null, "	");
  return entries;
};
const withBeforeConvert$1 = (convertFn) => (entries, options) => {
  entries = beforeConvert$1(entries, options);
  entries = convertFn(entries, options);
  return entries;
};
const beforeConvert$1 = (entries, options) => {
  entries = toArray(entries);
  entries = exportMedia(entries, options);
  if (options.relationsAsId) {
    entries = exportRelationsAsId(entries, options);
  }
  if (getModel(options.slug).kind === "singleType") {
    return entries?.[0];
  }
  return entries;
};
const exportMedia = (entries, options) => {
  if (options.slug === CustomSlugToSlug[CustomSlugs.MEDIA]) {
    entries = entries.map((entry) => {
      if (isObjectSafe(entry) && entry.url.startsWith("/")) {
        entry.url = computeUrl(entry.url);
      }
      return entry;
    });
    return entries;
  }
  const mediaKeys = getModelAttributes(options.slug, { filterOutTarget: ["admin::user"], filterType: ["media"] }).map((attr) => attr.name);
  const relationsAttr = getModelAttributes(options.slug, { filterOutTarget: ["admin::user"], filterType: ["component", "dynamiczone", "relation"] });
  entries = entries.map((entry) => {
    mediaKeys.forEach((key) => {
      if (isArraySafe(entry[key])) {
        entry[key] = entry[key].map((entryItem) => {
          if (isObjectSafe(entryItem) && entryItem.url.startsWith("/")) {
            entryItem.url = computeUrl(entryItem.url);
          }
          return entryItem;
        });
      } else if (isObjectSafe(entry[key]) && entry[key].url.startsWith("/")) {
        entry[key].url = computeUrl(entry[key].url);
      }
    });
    relationsAttr.forEach((attr) => {
      if (attr.type === "component") {
        if (entry[attr.name]) {
          const areMultiple = attr.repeatable;
          const relEntriesProcessed = exportMedia(toArray(entry[attr.name]), { slug: attr.component });
          entry[attr.name] = areMultiple ? relEntriesProcessed : relEntriesProcessed?.[0] || null;
        }
      } else if (attr.type === "dynamiczone") {
        if (entry[attr.name]) {
          entry[attr.name] = entry[attr.name].map((component) => exportMedia([component], { slug: component.__component })?.[0] || null);
        }
      } else if (attr.type === "relation") {
        if (entry[attr.name]) {
          const areMultiple = isArraySafe(entry[attr.name]);
          const relEntriesProcessed = exportMedia(toArray(entry[attr.name]), { slug: attr.target });
          entry[attr.name] = areMultiple ? relEntriesProcessed : relEntriesProcessed?.[0] || null;
        }
      }
    });
    return entry;
  });
  return entries;
};
const computeUrl = (relativeUrl) => {
  return getConfig("serverPublicHostname") + relativeUrl;
};
const exportRelationsAsId = (entries, options) => {
  const relationKeys = getModelAttributes(options.slug, { filterOutTarget: ["admin::user"], filterType: ["component", "dynamiczone", "media", "relation"] }).map(
    (attr) => attr
  );
  return entries.map((entry) => {
    relationKeys.forEach((key) => {
      const relationName = key.name;
      if (entry[relationName] == null) {
        entry[relationName] = null;
      } else if (isArraySafe(entry[relationName])) {
        entry[relationName] = entry[relationName].map((rel) => {
          if (key.type === "component") {
            console.log(relationName, JSON.stringify(rel));
            return exportRelationsAsId(toArray(rel), { slug: key.component });
          } else {
            if (typeof rel === "object") {
              return rel.id;
            }
            return rel;
          }
        });
      } else if (isObjectSafe(entry[relationName])) {
        entry[relationName] = entry[relationName].id;
      }
    });
    return entry;
  });
};
const convertToCsvWithBeforeConvert = withBeforeConvert$1(convertToCsv);
const convertToJsonWithBeforeConvert = withBeforeConvert$1(convertToJson$1);
const dataFormats$1 = {
  CSV: "csv",
  JSON: "json",
  JSON_V2: "json-v2",
  JSON_V3: "json-v3"
};
const dataConverterConfigs$1 = {
  [dataFormats$1.CSV]: {
    convertEntries: convertToCsvWithBeforeConvert
  },
  [dataFormats$1.JSON]: {
    convertEntries: convertToJsonWithBeforeConvert
  }
};
const exportData = async ({ slug, search, applySearch, exportFormat, relationsAsId, deepness = 5 }) => {
  const slugToProcess = CustomSlugToSlug[slug] || slug;
  const queryBuilder = new ObjectBuilder();
  queryBuilder.extend(getPopulateFromSchema$1(slugToProcess, deepness));
  if (applySearch) {
    queryBuilder.extend(buildFilterQuery$1(search));
  }
  const query = queryBuilder.get();
  const entries = await strapi.documents(slugToProcess).findMany(query);
  const data = convertData$1(entries, {
    slug: slugToProcess,
    dataFormat: exportFormat,
    relationsAsId
  });
  return data;
};
const buildFilterQuery$1 = (search) => {
  let { filters, sort: sortRaw } = qs__default.default.parse(search);
  const [attr, value] = sortRaw?.split(":") || [];
  let sort = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }
  return {
    filters,
    sort
  };
};
const convertData$1 = (entries, options) => {
  const converter = getConverter$1(options.dataFormat);
  const convertedData = converter.convertEntries(entries, options);
  return convertedData;
};
const getConverter$1 = (dataFormat) => {
  const converter = dataConverterConfigs$1[dataFormat];
  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }
  return converter;
};
const getPopulateFromSchema$1 = (slug, deepness = 5) => {
  if (deepness <= 1) {
    return true;
  }
  if (slug === "admin::user") {
    return void 0;
  }
  const populate = {};
  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes$1(model))) {
    if (!attribute) {
      continue;
    }
    if (attribute.type === "component") {
      populate[attributeName] = getPopulateFromSchema$1(attribute.component, deepness - 1);
    } else if (attribute.type === "dynamiczone") {
      const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
        const compPopulate = getPopulateFromSchema$1(component, deepness - 1);
        return compPopulate === true ? zonePopulate : fp.merge(zonePopulate, compPopulate);
      }, {});
      populate[attributeName] = fp.isEmpty(dynamicPopulate) ? true : dynamicPopulate;
    } else if (attribute.type === "relation") {
      const relationPopulate = getPopulateFromSchema$1(attribute.target, deepness - 1);
      if (relationPopulate) {
        populate[attributeName] = relationPopulate;
      }
    } else if (attribute.type === "media") {
      populate[attributeName] = true;
    }
  }
  return fp.isEmpty(populate) ? true : { populate };
};
const getModelPopulationAttributes$1 = (model) => {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }
  return model.attributes;
};
const convertToJson = withBeforeConvert(convertToJsonImpl);
function convertToJsonImpl(jsoContent) {
  return JSON.stringify(jsoContent, null, "	");
}
function withBeforeConvert(convertFn) {
  return (jsoContent, options) => {
    return convertFn(beforeConvert(jsoContent), options);
  };
}
function beforeConvert(jsoContent, options) {
  jsoContent = buildMediaUrl(jsoContent);
  jsoContent = pickMediaAttributes(jsoContent);
  return jsoContent;
}
function buildMediaUrl(jsoContent, options) {
  let mediaSlug = CustomSlugToSlug[CustomSlugs.MEDIA];
  let media = jsoContent.data[mediaSlug];
  if (!media) {
    return jsoContent;
  }
  media = _.fromPairs(
    _.toPairs(media).map(([id, medium]) => {
      if (isRelativeUrl(medium.url)) {
        medium.url = buildAbsoluteUrl(medium.url);
      }
      return [id, medium];
    })
  );
  jsoContent.data[mediaSlug] = media;
  return jsoContent;
}
function isRelativeUrl(url) {
  return url.startsWith("/");
}
function buildAbsoluteUrl(relativeUrl) {
  return getConfig("serverPublicHostname") + relativeUrl;
}
function pickMediaAttributes(jsoContent, options) {
  let mediaSlug = CustomSlugToSlug[CustomSlugs.MEDIA];
  let media = jsoContent.data[mediaSlug];
  if (!media) {
    return jsoContent;
  }
  media = _.fromPairs(
    _.toPairs(media).map(([id, medium]) => {
      medium = _.pick(medium, ["id", "name", "alternativeText", "caption", "hash", "ext", "mime", "url", "createdAt", "updatedAt", "createdBy", "updatedBy"]);
      return [id, medium];
    })
  );
  jsoContent.data[mediaSlug] = media;
  return jsoContent;
}
const dataFormats = {
  JSON: "json"
};
const dataConverterConfigs = {
  [dataFormats.JSON]: {
    convertEntries: convertToJson
  }
};
async function exportDataV2({
  slug,
  search,
  applySearch,
  deepness = 5,
  exportPluginsContentTypes
}) {
  const slugsToExport = slug === CustomSlugs.WHOLE_DB ? getAllSlugs({ includePluginsContentTypes: exportPluginsContentTypes }) : toArray(CustomSlugToSlug[slug] || slug);
  let store = {};
  for (const slug2 of slugsToExport) {
    const hierarchy = buildSlugHierarchy(slug2, deepness);
    store = await findEntriesForHierarchy(store, slug2, hierarchy, deepness, { ...applySearch ? { search } : {} });
  }
  const jsoContent = {
    version: 2,
    data: store
  };
  const fileContent = convertData(jsoContent, {
    dataFormat: "json"
  });
  return fileContent;
}
async function findEntriesForHierarchy(store, slug, hierarchy, deepness, { search, ids }) {
  const schema = getModel(slug);
  if (schema.uid === "admin::user") {
    return {};
  }
  let entries = await findEntries(slug, deepness, { search, ids }).then((entries2) => {
    entries2 = toArray(entries2).filter(Boolean);
    if (schema.pluginOptions?.i18n?.localized) {
      const allEntries = [...entries2];
      const entryIdsToExported = fromPairs__default.default(allEntries.map((entry) => [entry.id, true]));
      for (const entry of entries2) {
        (entry.localizations || []).forEach((localization) => {
          if (localization.id && !entryIdsToExported[localization.id]) {
            allEntries.push(localization);
            entryIdsToExported[localization.id] = true;
          }
        });
      }
      return allEntries;
    }
    return entries2;
  }).then((entries2) => toArray(entries2));
  let entriesFlatten = cloneDeep__default.default(entries);
  (() => {
    const flattenEntryCommon = (entry) => {
      if (entry == null) {
        return null;
      } else if (isArraySafe(entry)) {
        return entry.map((rel) => {
          if (isObjectSafe(rel)) {
            return rel.id;
          }
          return rel;
        });
      } else if (isObjectSafe(entry)) {
        return entry.id;
      }
      return entry;
    };
    const flattenProperty = (propAttribute, propEntries) => {
      if (propEntries == null) {
        return null;
      } else if (isComponentAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      } else if (isDynamicZoneAttribute(propAttribute)) {
        return propEntries.map((entry) => ({
          __component: entry.__component,
          id: entry.id
        }));
      } else if (isMediaAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      } else if (isRelationAttribute(propAttribute)) {
        return flattenEntryCommon(propEntries);
      }
      return propEntries;
    };
    const flattenEntry = (entry, slug2) => {
      const attributes = getModelAttributes(slug2, { filterType: ["component", "dynamiczone", "media", "relation"] });
      for (const attribute of attributes) {
        setEntryProp(entry, attribute.name, flattenProperty(attribute, getEntryProp(entry, attribute.name)));
      }
      return entry;
    };
    entriesFlatten = entriesFlatten.map((entry) => flattenEntry(entry, slug));
  })();
  store = mergeObjects({ [slug]: Object.fromEntries(entriesFlatten.map((entry) => [entry.id, entry])) }, store);
  const filterOutUnwantedRelations = () => {
    const UNWANTED_RELATIONS = ["admin::user"];
    const attributes = getModelAttributes(slug, { filterType: ["relation"] });
    return entries.map((entry) => {
      attributes.forEach((attribute) => {
        if (UNWANTED_RELATIONS.includes(attribute.target)) {
          deleteEntryProp(entry, attribute.name);
        }
      });
      return entry;
    });
  };
  filterOutUnwantedRelations();
  const findAndFlattenComponentAttributes = async () => {
    let attributes = getModelAttributes(slug, { filterType: ["component"] });
    for (const attribute of attributes) {
      const attributeSlug = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }
      const ids2 = entries.filter((entry) => !!getEntryProp(entry, attribute.name)).flatMap((entry) => getEntryProp(entry, attribute.name)).filter((entry) => !!entry.id).map((entry) => entry.id).filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === "undefined");
      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids: ids2 });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenComponentAttributes();
  const findAndFlattenDynamicZoneAttributes = async () => {
    let attributes = getModelAttributes(slug, { filterType: ["dynamiczone"] });
    for (const attribute of attributes) {
      for (const slugFromAttribute of attribute.components) {
        const componentHierarchy = hierarchy[attribute.name]?.[slugFromAttribute];
        const componentSlug = componentHierarchy?.__slug;
        if (!componentSlug) {
          continue;
        }
        const ids2 = entries.filter((entry) => !!getEntryProp(entry, attribute.name)).flatMap((entry) => getEntryProp(entry, attribute.name)).filter((entry) => entry?.__component === slugFromAttribute).map((entry) => entry.id).filter((id) => typeof store?.[componentSlug]?.[`${id}`] === "undefined");
        const dataToStore = await findEntriesForHierarchy(store, componentSlug, componentHierarchy, deepness - 1, { ids: ids2 });
        store = mergeObjects(dataToStore, store);
      }
    }
  };
  await findAndFlattenDynamicZoneAttributes();
  const findAndFlattenMediaAttributes = async () => {
    let attributes = getModelAttributes(slug, { filterType: ["media"] });
    for (const attribute of attributes) {
      const attributeSlug = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }
      const ids2 = entries.filter((entry) => !!getEntryProp(entry, attribute.name)).flatMap((entry) => getEntryProp(entry, attribute.name)).filter((entry) => !!entry.id).map((entry) => entry.id).filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === "undefined");
      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids: ids2 });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenMediaAttributes();
  const findAndFlattenRelationAttributes = async () => {
    let attributes = getModelAttributes(slug, { filterType: ["relation"] });
    for (const attribute of attributes) {
      const attributeSlug = hierarchy[attribute.name]?.__slug;
      if (!attributeSlug) {
        continue;
      }
      const ids2 = entries.filter((entry) => !!getEntryProp(entry, attribute.name)).flatMap((entry) => getEntryProp(entry, attribute.name)).filter((entry) => !!entry.id).map((entry) => entry.id).filter((id) => typeof store?.[attributeSlug]?.[`${id}`] === "undefined");
      const dataToStore = await findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids: ids2 });
      store = mergeObjects(dataToStore, store);
    }
  };
  await findAndFlattenRelationAttributes();
  return store;
}
async function findEntries(slug, deepness, { search, ids }) {
  try {
    const queryBuilder = new ObjectBuilder();
    queryBuilder.extend(getPopulateFromSchema(slug, deepness));
    if (search) {
      queryBuilder.extend(buildFilterQuery(search));
    } else if (ids) {
      queryBuilder.extend({
        filters: {
          id: { $in: ids }
        }
      });
    }
    const entries = await strapi.documents(slug).findMany(queryBuilder.get());
    return entries;
  } catch (_2) {
    return [];
  }
}
function buildFilterQuery(search = "") {
  let { filters, sort: sortRaw } = qs__default.default.parse(search);
  const [attr, value] = sortRaw?.split(":") || [];
  const sort = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }
  return {
    filters,
    sort
  };
}
function convertData(exportContent, options) {
  const converter = getConverter(options.dataFormat);
  const convertedData = converter.convertEntries(exportContent, options);
  return convertedData;
}
function getConverter(dataFormat) {
  const converter = dataConverterConfigs[dataFormat];
  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }
  return converter;
}
function getPopulateFromSchema(slug, deepness = 5) {
  if (deepness <= 1) {
    return true;
  }
  if (slug === "admin::user") {
    return void 0;
  }
  const populate = {};
  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }
    console.log("attribute", JSON.stringify(attribute, null, 2));
    console.log("attributeName", attributeName);
    if (isComponentAttribute(attribute)) {
      populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
    } else if (isDynamicZoneAttribute(attribute)) {
      const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
        const compPopulate = getPopulateFromSchema(component, deepness - 1);
        return compPopulate === true ? zonePopulate : fp.merge(zonePopulate, compPopulate);
      }, {});
      populate[attributeName] = fp.isEmpty(dynamicPopulate) ? true : dynamicPopulate;
    } else if (isRelationAttribute(attribute)) {
      const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
      if (relationPopulate) {
        populate[attributeName] = relationPopulate;
      }
    } else if (isMediaAttribute(attribute)) {
      populate[attributeName] = true;
    }
  }
  return fp.isEmpty(populate) ? true : { populate };
}
function buildSlugHierarchy(slug, deepness = 5) {
  slug = CustomSlugToSlug[slug] || slug;
  if (deepness <= 1) {
    return { __slug: slug };
  }
  const hierarchy = {
    __slug: slug
  };
  const model = getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }
    if (isComponentAttribute(attribute)) {
      hierarchy[attributeName] = buildSlugHierarchy(attribute.component, deepness - 1);
    } else if (isDynamicZoneAttribute(attribute)) {
      hierarchy[attributeName] = Object.fromEntries(attribute.components.map((componentSlug) => [componentSlug, buildSlugHierarchy(componentSlug, deepness - 1)]));
    } else if (isRelationAttribute(attribute)) {
      const relationHierarchy = buildSlugHierarchy(attribute.target, deepness - 1);
      if (relationHierarchy) {
        hierarchy[attributeName] = relationHierarchy;
      }
    } else if (isMediaAttribute(attribute)) {
      hierarchy[attributeName] = buildSlugHierarchy(CustomSlugs.MEDIA, deepness - 1);
    }
  }
  return hierarchy;
}
function getModelPopulationAttributes(model) {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }
  return model.attributes;
}
const exportService = {
  formats: dataFormats$1,
  exportData,
  getPopulateFromSchema: getPopulateFromSchema$1,
  exportDataV2,
  exportDataV3
};
async function findOrImportFile(fileEntry, user, { allowedFileTypes }) {
  let obj = {};
  if (typeof fileEntry === "string") {
    obj.url = fileEntry;
  } else if (isObjectSafe(fileEntry)) {
    obj = fileEntry;
  } else {
    throw new Error(`Invalid data format '${typeof fileEntry}' to import media. Only 'string', 'number', 'object' are accepted.`);
  }
  let file = await findFile(obj, user, allowedFileTypes);
  if (file) {
    if (isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
      return file;
    }
    return null;
  }
  if (obj.url) {
    const isAbsoluteUrl = obj.url.startsWith("http://") || obj.url.startsWith("https://");
    if (isAbsoluteUrl) {
      const fileData = getFileDataFromRawUrl(obj.url);
      if (!obj.name) {
        obj.name = fileData.name;
      }
      if (!obj.hash) {
        obj.hash = fileData.hash;
      }
      file = await findFile(obj, user, allowedFileTypes);
      if (file && isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
        console.log("Found file after processing absolute URL");
        return file;
      }
    } else {
      console.log("Skipping URL processing for relative URL:", obj.url);
    }
  }
  return null;
}
const findFile = async ({ hash, name, url, alternativeText, caption }, user, allowedFileTypes) => {
  let file = null;
  if (!file && hash) {
    [file] = await strapi.documents("plugin::upload.file").findMany({
      filters: {
        hash: { $startsWith: hash }
      },
      limit: 1
    });
  }
  if (!file && name) {
    [file] = await strapi.documents("plugin::upload.file").findMany({ filters: { name }, limit: 1 });
  }
  if (!file && url) {
    const checkResult = isValidFileUrl(url, allowedFileTypes);
    if (checkResult.isValid) {
      file = await findFile({ hash: checkResult.fileData.hash, name: checkResult.fileData.fileName }, user, allowedFileTypes);
      if (!file) {
        file = await importFile({ url: checkResult.fileData.rawUrl, name, alternativeText, caption }, user);
      }
    }
  }
  return file;
};
const importFile = async ({ url, name, alternativeText, caption }, user) => {
  let file;
  try {
    file = await fetchFile(url);
    let [uploadedFile] = await strapi.plugin("upload").service("upload").upload(
      {
        files: {
          filepath: file.path,
          originalFileName: file.name,
          size: file.size,
          mimetype: file.type
        },
        data: {
          fileInfo: {
            name: name || file.name,
            alternativeText: alternativeText || "",
            caption: caption || ""
          }
        }
      },
      { user }
    );
    return uploadedFile;
  } catch (err) {
    strapi.log.error(err);
    throw err;
  } finally {
    if (file?.path) {
      deleteFileIfExists(file?.path);
    }
  }
};
const fetchFile = async (url) => {
  try {
    const response = await fetch__default.default(url);
    const contentType = response.headers.get("content-type")?.split(";")?.[0] || "";
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10) || 0;
    const buffer = await response.buffer();
    const fileData = getFileDataFromRawUrl(url);
    const filePath = await writeFile(fileData.name, buffer);
    return {
      name: fileData.name,
      type: contentType,
      size: contentLength,
      path: filePath
    };
  } catch (error) {
    throw new Error(`Tried to fetch file from url ${url} but failed with error: ${error.message}`);
  }
};
const writeFile = async (name, content) => {
  const tmpWorkingDirectory = await fse__default.default.mkdtemp(path__default.default.join(os__default.default.tmpdir(), "strapi-upload-"));
  const filePath = path__default.default.join(tmpWorkingDirectory, name);
  try {
    fs__default.default.writeFileSync(filePath, content);
    return filePath;
  } catch (err) {
    strapi.log.error(err);
    throw err;
  }
};
const deleteFileIfExists = (filePath) => {
  if (filePath && fs__default.default.existsSync(filePath)) {
    fs__default.default.rmSync(filePath);
  }
};
const isValidFileUrl = (url, allowedFileTypes) => {
  try {
    const fileData = getFileDataFromRawUrl(url);
    return {
      isValid: isExtensionAllowed(fileData.extension, allowedFileTypes),
      fileData: {
        hash: fileData.hash,
        fileName: fileData.name,
        rawUrl: url
      }
    };
  } catch (err) {
    strapi.log.error(err);
    return {
      isValid: false,
      fileData: {
        hash: "",
        fileName: "",
        rawUrl: ""
      }
    };
  }
};
const isExtensionAllowed = (ext, allowedFileTypes) => {
  const checkers = allowedFileTypes.map(getFileTypeChecker);
  return checkers.some((checker) => checker(ext));
};
const ALLOWED_AUDIOS = ["mp3", "wav", "ogg"];
const ALLOWED_IMAGES = ["png", "gif", "jpg", "jpeg", "svg", "bmp", "tif", "tiff", "webp", "heic", "heif", "ico"];
const ALLOWED_VIDEOS = ["mp4", "avi", "webm", "hevc", "heifc"];
const fileTypeCheckers = {
  any: (ext) => true,
  audios: (ext) => ALLOWED_AUDIOS.includes(ext),
  files: (ext) => true,
  images: (ext) => ALLOWED_IMAGES.includes(ext),
  videos: (ext) => ALLOWED_VIDEOS.includes(ext)
};
const getFileTypeChecker = (type) => {
  const checker = fileTypeCheckers[type];
  if (!checker) {
    throw new Error(`Strapi file type ${type} not handled.`);
  }
  return checker;
};
const getFileDataFromRawUrl = (rawUrl) => {
  const parsedUrl = new URL(decodeURIComponent(rawUrl));
  const name = trim__default.default(parsedUrl.pathname, "/").replace(/\//g, "-");
  const extension = parsedUrl.pathname.split(".").pop()?.toLowerCase() || "";
  const hash = utils.strings.nameToSlug(name.slice(0, -(extension.length + 1)) || "", { separator: "_", lowercase: false });
  return {
    hash,
    name,
    extension
  };
};
const importData = async (dataRaw, { slug, format, user, idField }) => {
  let data = await parseInputData(format, dataRaw, { slug });
  data = toArray(data);
  console.log("importDatas", slug, format, user, idField);
  let res;
  if (slug === CustomSlugs.MEDIA) {
    res = await importMedia$1(data, { user });
  } else {
    res = await importOtherSlug(data, { slug, user, idField });
  }
  return res;
};
const importMedia$1 = async (fileData, { user }) => {
  const processed = [];
  for (let fileDatum of fileData) {
    let res;
    try {
      await findOrImportFile(fileDatum, user, { allowedFileTypes: ["any"] });
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [fileDatum] };
    }
    processed.push(res);
  }
  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));
  return {
    failures
  };
};
const importOtherSlug = async (data, { slug, user, idField }) => {
  const processed = [];
  for (let datum of data) {
    let res;
    try {
      await updateOrCreate$1(user, slug, datum, idField);
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [datum] };
    }
    processed.push(res);
  }
  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));
  return {
    failures
  };
};
const updateOrCreate$1 = async (user, slug, data, idField = "id") => {
  const relationAttributes = getModelAttributes(slug, { filterType: ["component", "dynamiczone", "media", "relation"] });
  for (let attribute of relationAttributes) {
    data[attribute.name] = await updateOrCreateRelation(user, attribute, data[attribute.name]);
  }
  let entry;
  const model = getModel(slug);
  if (model.kind === "singleType") {
    entry = await updateOrCreateSingleType(user, slug, data);
  } else {
    entry = await updateOrCreateCollectionType(user, slug, data, idField);
  }
  return entry;
};
const updateOrCreateCollectionType = async (user, slug, data, idField) => {
  const whereBuilder = new ObjectBuilder();
  if (data[idField]) {
    whereBuilder.extend({ [idField]: data[idField] });
  }
  const where = whereBuilder.get();
  if (idField !== "id") {
    delete data.id;
  }
  let entry;
  if (!where[idField]) {
    entry = await strapi.db.query(slug).create({ data });
  } else {
    entry = await strapi.db.query(slug).update({ where, data });
    if (!entry) {
      entry = await strapi.db.query(slug).create({ data });
    }
  }
  return entry;
};
const updateOrCreateSingleType = async (user, slug, data, idField) => {
  delete data.id;
  let [entry] = await strapi.db.query(slug).findMany();
  if (!entry) {
    entry = await strapi.db.query(slug).create({ data });
  } else {
    entry = await strapi.db.query(slug).update({ where: { id: entry.id }, data });
  }
  return entry;
};
const updateOrCreateRelation = async (user, rel, relData) => {
  if (relData == null) {
    return null;
  }
  if (["createdBy", "updatedBy"].includes(rel.name)) {
    return user.id;
  } else if (rel.type === "dynamiczone") {
    const components = [];
    for (const componentDatum of relData || []) {
      let component = await updateOrCreate$1(user, componentDatum.__component, componentDatum);
      component = { ...component, __component: componentDatum.__component };
      components.push(component);
    }
    return components;
  } else if (rel.type === "component") {
    relData = toArray(relData);
    relData = rel.repeatable ? relData : relData.slice(0, 1);
    const entryIds = [];
    for (const relDatum of relData) {
      if (typeof relDatum === "number") {
        entryIds.push(relDatum);
      } else if (isObjectSafe(relDatum)) {
        const entry = await updateOrCreate$1(user, rel.component, relDatum);
        if (entry?.id) {
          entryIds.push(entry.id);
        }
      }
    }
    return rel.repeatable ? entryIds : entryIds?.[0] || null;
  } else if (rel.type === "media") {
    relData = toArray(relData);
    relData = rel.multiple ? relData : relData.slice(0, 1);
    const entryIds = [];
    for (const relDatum of relData) {
      const media = await findOrImportFile(relDatum, user, { allowedFileTypes: rel.allowedTypes ?? ["any"] });
      if (media?.id) {
        entryIds.push(media.id);
      }
    }
    return rel.multiple ? entryIds : entryIds?.[0] || null;
  } else if (rel.type === "relation") {
    const isMultiple = isArraySafe(relData);
    relData = toArray(relData);
    const entryIds = [];
    for (const relDatum of relData) {
      if (typeof relDatum === "number") {
        entryIds.push(relDatum);
      } else if (isObjectSafe(relDatum)) {
        const entry = await updateOrCreate$1(user, rel.target, relDatum);
        if (entry?.id) {
          entryIds.push(entry.id);
        }
      }
    }
    return isMultiple ? entryIds : entryIds?.[0] || null;
  }
  throw new Error(`Could not update or create relation of type ${rel.type}.`);
};
class IdMapper {
  constructor() {
    this.mapping = {};
  }
  getMapping(slug, fileId) {
    return this.mapping[slug]?.get(`${fileId}`);
  }
  setMapping(slug, fileId, dbId) {
    if (!this.mapping[slug]) {
      this.mapping[slug] = /* @__PURE__ */ new Map();
    }
    this.mapping[slug].set(`${fileId}`, dbId);
  }
}
const importDataV2 = async (fileContent, {
  slug: slugArg,
  user,
  idField
}) => {
  const { data } = fileContent;
  const slugs = Object.keys(data);
  let failures = [];
  const fileIdToDbId = new IdMapper();
  const { componentSlugs, mediaSlugs, contentTypeSlugs } = splitSlugs(slugs);
  const componentsDataStore = {};
  for (const slug of componentSlugs) {
    componentsDataStore[slug] = data[slug];
  }
  for (const slug of mediaSlugs) {
    const res = await importMedia(data[slug], { user, fileIdToDbId });
    failures.push(...res.failures);
  }
  for (const slug of contentTypeSlugs) {
    const res = await importContentTypeSlug(data[slug], {
      slug,
      user,
      // Keep behavior of `idField` of version 1.
      ...slug === slugArg ? { idField } : {},
      importStage: "simpleAttributes",
      fileIdToDbId,
      componentsDataStore
    });
    failures.push(...res.failures);
  }
  for (const slug of contentTypeSlugs) {
    const res = await importContentTypeSlug(data[slug], {
      slug,
      user,
      // Keep behavior of `idField` of version 1.
      ...slug === slugArg ? { idField } : {},
      importStage: "relationAttributes",
      fileIdToDbId,
      componentsDataStore
    });
    failures.push(...res.failures);
  }
  if (strapi.db.config.connection.client === "postgres") {
    for (const slugFromFile of slugs) {
      const model = getModel(slugFromFile);
      await strapi.db.connection.raw(`SELECT SETVAL((SELECT PG_GET_SERIAL_SEQUENCE('${model.collectionName}', 'id')), (SELECT MAX(id) FROM ${model.collectionName}) + 1, FALSE);`);
    }
  }
  return { failures };
};
function splitSlugs(slugs) {
  const slugsToProcess = [...slugs];
  const componentSlugs = extract(slugsToProcess, (slug) => getModel(slug)?.modelType === "component");
  const mediaSlugs = extract(slugsToProcess, (slug) => ["plugin::upload.file"].includes(slug));
  const contentTypeSlugs = extract(slugsToProcess, (slug) => getModel(slug)?.modelType === "contentType");
  if (slugsToProcess.length > 0) {
    strapi.log.warn(`Some slugs won't be imported: ${slugsToProcess.join(", ")}`);
  }
  return {
    componentSlugs,
    mediaSlugs,
    contentTypeSlugs
  };
}
const importMedia = async (slugEntries, { user, fileIdToDbId }) => {
  const failures = [];
  const fileEntries = _.toPairs(slugEntries);
  for (let [fileId, fileEntry] of fileEntries) {
    try {
      const dbEntry = await findOrImportFile(fileEntry, user, { allowedFileTypes: ["any"] });
      if (dbEntry) {
        fileIdToDbId.setMapping("plugin::upload.file", fileId, dbEntry?.id);
      }
    } catch (err) {
      strapi.log.error(err);
      failures.push({ error: err, data: fileEntry });
    }
  }
  return {
    failures
  };
};
const importContentTypeSlug = async (slugEntries, {
  slug,
  user,
  idField,
  importStage,
  fileIdToDbId,
  componentsDataStore
}) => {
  let fileEntries = _.toPairs(slugEntries);
  const sortDataByLocale = async () => {
    const schema = getModel(slug);
    if (schema.pluginOptions?.i18n?.localized) {
      const defaultLocale = await strapi.plugin("i18n").service("locales").getDefaultLocale();
      fileEntries = fileEntries.sort((dataA, dataB) => {
        if (dataA[1].locale === defaultLocale && dataB[1].locale === defaultLocale) {
          return 0;
        } else if (dataA[1].locale === defaultLocale) {
          return -1;
        }
        return 1;
      });
    }
  };
  await sortDataByLocale();
  const failures = [];
  for (let [fileId, fileEntry] of fileEntries) {
    try {
      await updateOrCreate(user, slug, fileId, fileEntry, idField, { importStage, fileIdToDbId, componentsDataStore });
    } catch (err) {
      strapi.log.error(err);
      failures.push({ error: err, data: fileEntry });
    }
  }
  return {
    failures
  };
};
const updateOrCreate = async (user, slug, fileId, fileEntryArg, idFieldArg, { importStage, fileIdToDbId, componentsDataStore }) => {
  const schema = getModel(slug);
  const idField = idFieldArg || schema?.pluginOptions?.["import-export-entries"]?.idField || "id";
  let fileEntry = cloneDeep__default.default(fileEntryArg);
  if (importStage == "simpleAttributes") {
    fileEntry = removeComponents(schema, fileEntry);
    fileEntry = linkMediaAttributes(schema, fileEntry, { fileIdToDbId });
    const attributeNames = getModelAttributes(slug, { filterOutType: ["relation"] }).map(({ name }) => name).concat("id", "localizations", "locale");
    fileEntry = pick__default.default(fileEntry, attributeNames);
  } else if (importStage === "relationAttributes") {
    fileEntry = setComponents(schema, fileEntry, { fileIdToDbId, componentsDataStore });
    const attributeNames = getModelAttributes(slug, { filterType: ["component", "dynamiczone", "relation"] }).map(({ name }) => name).concat("id", "localizations", "locale");
    fileEntry = pick__default.default(fileEntry, attributeNames);
  }
  let dbEntry = null;
  if (schema?.modelType === "contentType" && schema?.kind === "singleType") {
    dbEntry = await updateOrCreateSingleTypeEntry(user, slug, fileId, fileEntry, { importStage, fileIdToDbId });
  } else {
    dbEntry = await updateOrCreateCollectionTypeEntry(user, slug, fileId, fileEntry, { idField, importStage, fileIdToDbId });
  }
  if (dbEntry) {
    fileIdToDbId.setMapping(slug, fileId, dbEntry.id);
  }
};
function linkMediaAttributes(schema, fileEntry, { fileIdToDbId }) {
  for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
    let attributeValue = fileEntry[attributeName];
    if (attributeValue == null) {
      continue;
    }
    if (isMediaAttribute(attribute)) {
      attributeValue = castArray__default.default(attributeValue).map((id) => fileIdToDbId.getMapping("plugin::upload.file", id)).filter(Boolean);
      if (!attribute.multiple) {
        attributeValue = attributeValue[0];
      }
      fileEntry[attributeName] = attributeValue;
    }
  }
  return fileEntry;
}
function removeComponents(schema, fileEntry) {
  const store = {};
  for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
    if (typeof fileEntry[attributeName] === "undefined") {
      continue;
    }
    if (isComponentAttribute(attribute)) {
      if (attribute.repeatable) {
        store[attributeName] = [];
      } else {
        store[attributeName] = null;
      }
    } else if (isDynamicZoneAttribute(attribute)) {
      store[attributeName] = [];
    }
  }
  return { ...fileEntry, ...store || {} };
}
function setComponents(schema, fileEntry, { fileIdToDbId, componentsDataStore }) {
  const store = {};
  for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
    const attributeValue = fileEntry[attributeName];
    if (attributeValue == null) {
      continue;
    } else if (isComponentAttribute(attribute)) {
      if (attribute.repeatable) {
        store[attributeName] = attributeValue.map(
          (componentFileId) => getComponentData(attribute.component, `${componentFileId}`, { fileIdToDbId, componentsDataStore })
        );
      } else {
        store[attributeName] = getComponentData(attribute.component, `${attributeValue}`, { fileIdToDbId, componentsDataStore });
      }
    } else if (isDynamicZoneAttribute(attribute)) {
      store[attributeName] = attributeValue.map(({ __component, id }) => getComponentData(__component, `${id}`, { fileIdToDbId, componentsDataStore }));
    }
  }
  return { ...fileEntry, ...store || {} };
}
function getComponentData(slug, fileId, { fileIdToDbId, componentsDataStore }) {
  const schema = getModel(slug);
  const fileEntry = componentsDataStore[slug][`${fileId}`];
  if (fileEntry == null) {
    return null;
  }
  const store = { ...omit__default.default(fileEntry, ["id"]), __component: slug };
  for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
    const attributeValue = fileEntry[attributeName];
    if (attributeValue == null) {
      store[attributeName] = null;
      continue;
    }
    if (isComponentAttribute(attribute)) {
      if (attribute.repeatable) {
        store[attributeName] = attributeValue.map(
          (componentFileId) => getComponentData(attribute.component, `${componentFileId}`, { fileIdToDbId, componentsDataStore })
        );
      } else {
        store[attributeName] = getComponentData(attribute.component, `${attributeValue}`, { fileIdToDbId, componentsDataStore });
      }
    } else if (isDynamicZoneAttribute(attribute)) {
      store[attributeName] = attributeValue.map(({ __component, id }) => getComponentData(__component, `${id}`, { fileIdToDbId, componentsDataStore }));
    } else if (isMediaAttribute(attribute)) {
      if (attribute.multiple) {
        store[attributeName] = attributeValue.map((id) => fileIdToDbId.getMapping("plugin::upload.file", id));
      } else {
        store[attributeName] = fileIdToDbId.getMapping("plugin::upload.file", attributeValue);
      }
    } else if (isRelationAttribute(attribute)) {
      if (attribute.relation.endsWith("Many")) {
        store[attributeName] = attributeValue.map((id) => fileIdToDbId.getMapping(attribute.target, id));
      } else {
        store[attributeName] = fileIdToDbId.getMapping(attribute.target, attributeValue);
      }
    } else if (isMediaAttribute(attribute)) {
      if (attribute.multiple) {
        store[attributeName] = castArray__default.default(attributeValue).map((id) => fileIdToDbId.getMapping("plugin::upload.file", id));
      } else {
        store[attributeName] = fileIdToDbId.getMapping("plugin::upload.file", `${_.head(castArray__default.default(attributeValue))}`);
      }
    }
  }
  return store;
}
const updateOrCreateCollectionTypeEntry = async (user, slug, fileId, fileEntry, { idField, importStage, fileIdToDbId }) => {
  const schema = getModel(slug);
  const whereBuilder = new ObjectBuilder();
  if (fileIdToDbId.getMapping(slug, fileId)) {
    whereBuilder.extend({ id: fileIdToDbId.getMapping(slug, fileId) });
  } else if (fileEntry[idField]) {
    whereBuilder.extend({ [idField]: fileEntry[idField] });
  }
  const where = whereBuilder.get();
  if (!schema.pluginOptions?.i18n?.localized) {
    let dbEntry = await strapi.db.query(slug).findOne({ where });
    if (!dbEntry) {
      return strapi.documents(slug).create({
        data: fileEntry
      });
    } else {
      return strapi.documents(slug).update({
        documentId: dbEntry.id,
        data: omit__default.default(fileEntry, ["id"])
      });
    }
  } else {
    if (!fileEntry.locale) {
      throw new Error(`No locale set to import entry for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
    }
    const defaultLocale = await strapi.plugin("i18n").service("locales").getDefaultLocale();
    const isDatumInDefaultLocale = fileEntry.locale === defaultLocale;
    let dbEntryDefaultLocaleId = null;
    let dbEntry = await strapi.db.query(slug).findOne({ where, populate: ["localizations"] });
    if (isDatumInDefaultLocale) {
      dbEntryDefaultLocaleId = dbEntry?.id || null;
    } else {
      if (dbEntry) {
        const localizedEntries = [dbEntry, ...dbEntry?.localizations || []];
        dbEntryDefaultLocaleId = localizedEntries.find((e) => e.locale === defaultLocale)?.id || null;
        dbEntry = localizedEntries.find((e) => e.locale === fileEntry.locale) || null;
      } else {
        let idx = 0;
        const fileLocalizationsIds = fileEntry?.localizations || [];
        while (idx < fileLocalizationsIds.length && !dbEntryDefaultLocaleId && !dbEntry) {
          const dbId = fileIdToDbId.getMapping(slug, fileLocalizationsIds[idx]);
          const localizedEntry = await strapi.db.query(slug).findOne({ where: { id: dbId }, populate: ["localizations"] });
          const localizedEntries = localizedEntry != null ? [localizedEntry, ...localizedEntry?.localizations || []] : [];
          if (!dbEntryDefaultLocaleId) {
            dbEntryDefaultLocaleId = localizedEntries.find((e) => e.locale === defaultLocale)?.id || null;
          }
          if (!dbEntry) {
            dbEntry = localizedEntries.find((e) => e.locale === fileEntry.locale) || null;
          }
          idx += 1;
        }
      }
    }
    fileEntry = omit__default.default(fileEntry, ["localizations"]);
    if (isEmpty__default.default(omit__default.default(fileEntry, ["id"]))) {
      return null;
    }
    if (isDatumInDefaultLocale) {
      if (!dbEntryDefaultLocaleId) {
        return strapi.documents(slug).create({
          data: fileEntry
        });
      } else {
        return strapi.documents(slug).update({
          documentId: dbEntryDefaultLocaleId,
          data: omit__default.default({ ...fileEntry }, ["id"])
        });
      }
    } else {
      if (!dbEntryDefaultLocaleId) {
        throw new Error(`Could not find default locale entry to import localization for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
      }
      if (!dbEntry) {
        const insertLocalizedEntry = strapi.plugin("i18n").service("core-api").createCreateLocalizationHandler(getModel(slug));
        return insertLocalizedEntry({ id: dbEntryDefaultLocaleId, data: omit__default.default({ ...fileEntry }, ["id"]) });
      } else {
        return strapi.documents(slug).update({
          documentId: dbEntry.id,
          data: omit__default.default({ ...fileEntry }, ["id"])
        });
      }
    }
  }
};
const updateOrCreateSingleTypeEntry = async (user, slug, fileId, fileEntry, { importStage, fileIdToDbId }) => {
  const schema = getModel(slug);
  if (!schema.pluginOptions?.i18n?.localized) {
    let dbEntry = await strapi.db.query(slug).findMany({}).then((entries) => toArray(entries)?.[0]);
    if (!dbEntry) {
      return strapi.documents(slug).create({
        data: fileEntry
      });
    } else {
      return strapi.documents(slug).update({
        documentId: dbEntry.id,
        data: omit__default.default(fileEntry, ["id"])
      });
    }
  } else {
    const defaultLocale = await strapi.plugin("i18n").service("locales").getDefaultLocale();
    const isDatumInDefaultLocale = !fileEntry.locale || fileEntry.locale === defaultLocale;
    fileEntry = omit__default.default(fileEntry, ["localizations"]);
    if (isEmpty__default.default(omit__default.default(fileEntry, ["id"]))) {
      return null;
    }
    let entryDefaultLocale = await strapi.db.query(slug).findOne({ where: { locale: defaultLocale } });
    if (!entryDefaultLocale) {
      entryDefaultLocale = await strapi.documents(slug).create({
        data: { ...fileEntry, locale: defaultLocale }
      });
    }
    if (isDatumInDefaultLocale) {
      if (!entryDefaultLocale) {
        return strapi.documents(slug).create({
          data: fileEntry
        });
      } else {
        return strapi.documents(slug).update({
          documentId: entryDefaultLocale.id,
          data: fileEntry
        });
      }
    } else {
      const entryLocale = await strapi.db.query(slug).findOne({ where: { locale: fileEntry.locale } });
      let datumLocale = { ...entryLocale, ...fileEntry };
      await strapi.db.query(slug).delete({ where: { locale: fileEntry.locale } });
      const insertLocalizedEntry = strapi.plugin("i18n").service("core-api").createCreateLocalizationHandler(getModel(slug));
      return insertLocalizedEntry({ id: entryDefaultLocale.id, data: datumLocale });
    }
  }
};
function createValidationError(message, path2, entry) {
  return { message, path: path2, entry };
}
async function validateFileContent(fileContent, options = {}) {
  if (!fileContent.version || fileContent.version !== 3) {
    return {
      isValid: false,
      errors: [createValidationError("Invalid file version. Expected version 3.")]
    };
  }
  if (!fileContent.data || typeof fileContent.data !== "object") {
    return {
      isValid: false,
      errors: [createValidationError("Invalid file structure. Expected data object.")]
    };
  }
  const errors = [];
  await validateContentTypes(fileContent.data, errors, options.existingAction, options.ignoreMissingRelations, fileContent.data);
  return {
    isValid: errors.length === 0,
    errors
  };
}
async function validateContentTypes(data, errors, existingAction, ignoreMissingRelations, importData2) {
  for (const [contentType, entries] of Object.entries(data)) {
    const model = getModel(contentType);
    if (!model) {
      errors.push(createValidationError(`Model ${contentType} not found`, [contentType]));
      continue;
    }
    try {
      validateModelConfiguration(model);
      await validateContentTypeEntries(contentType, entries, errors, existingAction, ignoreMissingRelations, importData2);
    } catch (error) {
      errors.push(createValidationError(
        `Validation failed for ${contentType}: ${error.message}`,
        [contentType]
      ));
    }
  }
}
async function validateContentTypeEntries(contentType, entries, errors, existingAction, ignoreMissingRelations, importData2) {
  try {
    const model = getModel(contentType);
    for (const entry of entries) {
      for (const [version, localeVersions] of Object.entries(entry)) {
        for (const [locale, data] of Object.entries(localeVersions)) {
          const path2 = [contentType, version, locale];
          await validateStructure(data, model, path2, errors);
          await validateContent(data, model, path2, errors, ignoreMissingRelations, importData2);
          if (version === "published") {
            await validateConstraints(data, model, path2, errors, existingAction);
          }
        }
      }
    }
  } catch (error) {
    errors.push(createValidationError(
      `Error validating entries for ${contentType}: ${error.message}`,
      [contentType]
    ));
    console.error(error);
  }
}
async function validateStructure(data, model, path2, errors, isDynamicZoneComponent = false) {
  validateUnknownFields(data, model, path2, errors, isDynamicZoneComponent);
  validateMediaFields(data, model, path2, errors);
  await validateComponentStructure(data, model, path2, errors);
}
async function validateComponentStructure(data, model, path2, errors) {
  if (!data || typeof data !== "object") return;
  for (const [fieldName, attr] of Object.entries(model.attributes)) {
    const value = data[fieldName];
    if (!value) continue;
    if (isComponentAttribute(attr)) {
      const componentModel = getModel(attr.component);
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(
            (item, index2) => validateStructure(item, componentModel, [...path2, fieldName, index2.toString()], errors)
          )
        );
      } else {
        await validateStructure(value, componentModel, [...path2, fieldName], errors);
      }
    } else if (isDynamicZoneAttribute(attr)) {
      if (!Array.isArray(value)) {
        errors.push(createValidationError(
          "Dynamic zone must be an array",
          [...path2, fieldName],
          value
        ));
        continue;
      }
      await Promise.all(
        value.map(async (item, index2) => {
          if (!item || typeof item !== "object") {
            errors.push(createValidationError(
              "Dynamic zone item must be an object",
              [...path2, fieldName, index2.toString()],
              item
            ));
            return;
          }
          if (!item.__component) {
            errors.push(createValidationError(
              "Dynamic zone item missing __component field",
              [...path2, fieldName, index2.toString()],
              item
            ));
            return;
          }
          if (!attr.components.includes(item.__component)) {
            errors.push(createValidationError(
              `Invalid component type '${item.__component}'. Allowed types are: ${attr.components.join(", ")}`,
              [...path2, fieldName, index2.toString(), "__component"],
              item.__component
            ));
            return;
          }
          const componentModel = getModel(item.__component);
          if (componentModel) {
            await validateStructure(item, componentModel, [...path2, fieldName, index2.toString()], errors, true);
          }
        })
      );
    }
  }
}
async function validateContent(data, model, path2, errors, ignoreMissingRelations, importData2) {
  const requiredAttributes = Object.entries(model.attributes).filter(([_2, attr]) => attr.required);
  await Promise.all(
    requiredAttributes.map(async ([fieldName, attr]) => {
      const value = data[fieldName];
      if (value === void 0 || value === null) {
        errors.push(createValidationError(
          `Required field '${fieldName}' is missing`,
          [...path2, fieldName],
          data
        ));
        return;
      }
      if (isRelationAttribute(attr)) {
        await validateRequiredRelation(attr, value, path2, errors, fieldName);
      }
    })
  );
  if (!ignoreMissingRelations) {
    const relationAttributes = Object.entries(model.attributes).filter(([_2, attr]) => isRelationAttribute(attr));
    await Promise.all(
      relationAttributes.map(async ([fieldName, attr]) => {
        const value = data[fieldName];
        if (value !== void 0 && value !== null) {
          await validateRelation(
            attr,
            value,
            path2,
            errors,
            fieldName,
            importData2
          );
        }
      })
    );
  }
  await validateComponentContent(data, model, path2, errors, ignoreMissingRelations, importData2);
}
async function validateRelation(attr, value, path2, errors, attrName, importData2) {
  const targetModel = getModel(attr.target);
  const targetIdField = getIdentifierField(targetModel);
  async function checkRelationExists(id) {
    const publishedVersion = await strapi.documents(attr.target).findFirst({
      filters: { [targetIdField]: id },
      status: "published"
    });
    const draftVersion = await strapi.documents(attr.target).findFirst({
      filters: { [targetIdField]: id },
      status: "draft"
    });
    if (publishedVersion && draftVersion && publishedVersion.documentId !== draftVersion.documentId) {
      errors.push(createValidationError(
        `Found conflicting published and draft versions for relation ${attr.target} with ${targetIdField}='${id}'`,
        [...path2, attrName],
        value
      ));
      return;
    }
    const exists = publishedVersion || draftVersion;
    if (!exists && (!importData2 || !checkImportData(id))) {
      errors.push(createValidationError(
        `Related entity with ${targetIdField}='${id}' not found in ${attr.target} (checked both published and draft)`,
        [...path2, attrName],
        value
      ));
    }
  }
  function checkImportData(id) {
    const targetEntries = importData2[attr.target] || [];
    return targetEntries.some((entry) => {
      if (entry.published) {
        const publishedMatch = Object.values(entry.published).some(
          (localeData) => localeData[targetIdField] === id
        );
        if (publishedMatch) return true;
      }
      if (entry.draft) {
        return Object.values(entry.draft).some(
          (localeData) => localeData[targetIdField] === id
        );
      }
      return false;
    });
  }
  if (Array.isArray(value)) {
    await Promise.all(value.map((id) => checkRelationExists(id)));
  } else {
    await checkRelationExists(value);
  }
}
async function validateComponentContent(data, model, path2, errors, ignoreMissingRelations, importData2) {
  if (!data || typeof data !== "object") return;
  for (const [fieldName, attr] of Object.entries(model.attributes)) {
    const value = data[fieldName];
    if (!value) continue;
    if (isComponentAttribute(attr)) {
      const componentModel = getModel(attr.component);
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(
            (item, index2) => validateContent(
              item,
              componentModel,
              [...path2, fieldName, index2.toString()],
              errors,
              ignoreMissingRelations,
              importData2
            )
          )
        );
      } else {
        await validateContent(
          value,
          componentModel,
          [...path2, fieldName],
          errors,
          ignoreMissingRelations,
          importData2
        );
      }
    } else if (isDynamicZoneAttribute(attr)) {
      if (Array.isArray(value)) {
        await Promise.all(
          value.map(async (item, index2) => {
            if (item && item.__component) {
              const componentModel = getModel(item.__component);
              if (componentModel) {
                await validateContent(
                  item,
                  componentModel,
                  [...path2, fieldName, index2.toString()],
                  errors,
                  ignoreMissingRelations,
                  importData2
                );
              }
            }
          })
        );
      }
    }
  }
}
async function validateConstraints(data, model, path2, errors, existingAction) {
  await validateUniqueFields(
    model.uid,
    [{ published: { default: data } }],
    errors,
    existingAction
  );
}
function attributeIsUnique(attribute) {
  return "unique" in attribute;
}
function validateModelConfiguration(model) {
  if (model.kind !== "singleType") {
    validateIdField(model);
  }
}
function validateMediaField(value, path2, errors) {
  const isValidUrl = (url) => url.startsWith("http://") || url.startsWith("https://");
  if (Array.isArray(value)) {
    value.forEach((item, index2) => validateMediaField(item, [...path2, index2.toString()], errors));
    return;
  }
  if (typeof value === "string") {
    if (!isValidUrl(value)) {
      errors.push(createValidationError("Media URL must be absolute", path2, value));
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    const hasIdentifier = value.url || value.hash || value.name;
    if (!hasIdentifier) {
      errors.push(createValidationError(
        "Media object must contain either url, hash, or name",
        path2,
        value
      ));
      return;
    }
    if (value.url && !value.hash && !value.name && !isValidUrl(value.url)) {
      errors.push(createValidationError(
        "Media URL must be absolute when used as the only identifier",
        path2,
        value
      ));
    }
    return;
  }
  errors.push(createValidationError(
    `Invalid media value type: ${typeof value}`,
    path2,
    value
  ));
}
function validateUnknownFields(data, model, path2, errors, isDynamicZoneComponent = false) {
  if (!data || typeof data !== "object") return;
  const validAttributeNames = new Set(Object.keys(model.attributes));
  const ignoredFields = isDynamicZoneComponent ? /* @__PURE__ */ new Set(["__component"]) : /* @__PURE__ */ new Set();
  if (isDynamicZoneComponent) {
    console.log("isDynamicZoneComponent", isDynamicZoneComponent);
    console.log("Attributes", JSON.stringify(model, null, 2));
  }
  for (const key of Object.keys(data)) {
    if (!validAttributeNames.has(key) && !ignoredFields.has(key)) {
      errors.push(createValidationError(
        `Unknown field '${key}' found in data. This field does not exist in the model.`,
        [...path2, key],
        data[key]
      ));
    }
  }
  for (const [key, attr] of Object.entries(model.attributes)) {
    if (!data[key]) continue;
    if (isComponentAttribute(attr)) {
      const componentModel = getModel(attr.component);
      if (Array.isArray(data[key])) {
        data[key].forEach((item, index2) => {
          validateUnknownFields(item, componentModel, [...path2, key, index2.toString()], errors, false);
        });
      } else {
        validateUnknownFields(data[key], componentModel, [...path2, key], errors, false);
      }
    } else if (isDynamicZoneAttribute(attr)) {
      if (Array.isArray(data[key])) {
        data[key].forEach((item, index2) => {
          if (item.__component) {
            const componentModel = getModel(item.__component);
            if (componentModel) {
              validateUnknownFields(item, componentModel, [...path2, key, index2.toString()], errors, true);
            }
          }
        });
      }
    }
  }
}
function validateMediaFields(data, model, path2, errors) {
  if (!data || typeof data !== "object") return;
  for (const [fieldName, attr] of Object.entries(model.attributes)) {
    if (data[fieldName] !== void 0 && data[fieldName] !== null && attr.type === "media") {
      validateMediaField(data[fieldName], [...path2, fieldName], errors);
    }
  }
}
async function validateRequiredRelation(attr, value, path2, errors, attrName) {
  const targetModel = getModel(attr.target);
  const targetIdField = getIdentifierField(targetModel);
  if (Array.isArray(value)) {
    for (const id of value) {
      const exists = await strapi.documents(attr.target).findFirst({
        filters: { [targetIdField]: id }
      });
      if (!exists) {
        errors.push({
          message: `Related entity with ${targetIdField}='${id}' not found in ${attr.target}`,
          path: [...path2, attrName],
          entry: value
        });
      }
    }
  } else {
    const exists = await strapi.documents(attr.target).findFirst({
      filters: { [targetIdField]: value }
    });
    if (!exists) {
      errors.push({
        message: `Related entity with ${targetIdField}='${value}' not found in ${attr.target}`,
        path: [...path2, attrName],
        entry: value
      });
    }
  }
}
async function validateUniqueFields(contentType, entries, errors, existingAction = ExistingAction.Warn) {
  const model = getModel(contentType);
  const uniqueAttributes = Object.entries(model.attributes).filter(([_2, attr]) => attributeIsUnique(attr) && attr.unique);
  const idField = getIdentifierField(model);
  const seenValues = {};
  uniqueAttributes.forEach(([name]) => seenValues[name] = /* @__PURE__ */ new Set());
  for (const entry of entries) {
    if (!entry.published) continue;
    for (const [locale, data] of Object.entries(entry.published)) {
      for (const [attrName, attr] of uniqueAttributes) {
        const value = data[attrName];
        if (value === void 0 || value === null) continue;
        if (seenValues[attrName].has(value)) {
          errors.push({
            message: `Duplicate value '${value}' for unique field '${attrName}'`,
            path: ["published", locale, attrName],
            entry: data
          });
          continue;
        }
        seenValues[attrName].add(value);
        const existing = await strapi.documents(contentType).findFirst({
          filters: { [attrName]: value }
        });
        if (existing) {
          console.log("Existing record:", existingAction, existing[idField], data[idField]);
          if (existing[idField] === data[idField]) {
            switch (existingAction) {
              case ExistingAction.Skip:
                console.log(`Found existing record with ${attrName}=${value}, will skip during import`);
                continue;
              case ExistingAction.Update:
                console.log(`Found existing record with ${attrName}=${value}, will update during import`);
                continue;
              case ExistingAction.Warn:
              default:
                errors.push({
                  message: `Value '${value}' for unique field '${attrName}' already exists in database`,
                  path: ["published", locale, attrName],
                  entry: data
                });
            }
          } else {
            errors.push({
              message: `Value '${value}' for unique field '${attrName}' already exists in database on a different record`,
              path: ["published", locale, attrName],
              entry: data
            });
          }
        }
      }
    }
  }
}
class ImportContext {
  // documentId -> { contentType, idValue }
  constructor(options, importData2, user, failures = []) {
    this.options = options;
    this.importData = importData2;
    this.user = user;
    this.failures = failures;
    this.createdDocumentIds = /* @__PURE__ */ new Set();
    this.updatedDocumentIds = /* @__PURE__ */ new Set();
    this.processedRecords = /* @__PURE__ */ new Map();
    this.processedRecordsByDocumentId = /* @__PURE__ */ new Map();
  }
  recordCreated(contentType, idValue, documentId) {
    const key = `${contentType}:${idValue ?? "SINGLE_TYPE"}`;
    this.createdDocumentIds.add(documentId);
    this.processedRecords.set(key, documentId);
    this.processedRecordsByDocumentId.set(documentId, { contentType, idValue: idValue ?? "SINGLE_TYPE" });
  }
  recordUpdated(contentType, idValue, documentId) {
    const key = `${contentType}:${idValue ?? "SINGLE_TYPE"}`;
    this.updatedDocumentIds.add(documentId);
    this.processedRecords.set(key, documentId);
    this.processedRecordsByDocumentId.set(documentId, { contentType, idValue: idValue ?? "SINGLE_TYPE" });
  }
  wasDocumentCreatedInThisImport(documentId) {
    return this.createdDocumentIds.has(documentId);
  }
  wasUpdatedInThisImport(contentType, idValue) {
    return this.updatedDocumentIds.has(`${contentType}:${idValue ?? "SINGLE_TYPE"}`);
  }
  findProcessedRecord(contentType, idValue) {
    return this.processedRecords.get(`${contentType}:${idValue ?? "SINGLE_TYPE"}`);
  }
  findProcessedRecordByDocumentId(documentId) {
    return this.processedRecordsByDocumentId.get(documentId);
  }
  addFailure(error, data, details) {
    this.failures.push({ error, data, details });
  }
  getFailures() {
    return this.failures;
  }
}
class ImportProcessor {
  constructor(context, services2, onProgress) {
    this.totalEntries = 0;
    this.processedEntries = 0;
    this.context = context;
    this.services = services2;
    this.onProgress = onProgress;
  }
  async process() {
    this.totalEntries = Object.values(this.context.importData).reduce(
      (count, entries) => count + entries.length,
      0
    );
    this.processedEntries = 0;
    this.reportProgress(0, `Starting import of ${this.totalEntries} entries`);
    let contentTypeIndex = 0;
    const totalContentTypes = Object.keys(this.context.importData).length;
    for (const [contentType, entries] of Object.entries(this.context.importData)) {
      const context = {
        operation: "import",
        contentType
      };
      contentTypeIndex++;
      this.reportProgress(
        contentTypeIndex / totalContentTypes * 0.1,
        // First 10% is for content type initialization
        `Processing content type ${contentType} (${contentTypeIndex}/${totalContentTypes})`
      );
      const model = getModel(contentType);
      if (!model) {
        logger.error(`Model not found`, context);
        this.context.addFailure(`Model ${contentType} not found`, contentType);
        continue;
      }
      const idField = model.kind !== "singleType" ? getIdentifierField(model) : void 0;
      logger.debug(`Processing entries with identifier field: ${idField}`, context);
      let entryIndex = 0;
      for (const entry of entries) {
        entryIndex++;
        this.reportProgress(
          0.1 + this.processedEntries / this.totalEntries * 0.9,
          // Remaining 90% is for entry processing
          `Processing entry ${entryIndex}/${entries.length} for ${contentType}`
        );
        try {
          await this.processEntry(contentType, entry, model, idField);
        } catch (error) {
          logger.error(`Failed to import entry`, context, error);
          if (error.details) {
            logger.debug("Error Details", { ...context, details: JSON.stringify(error.details, null, 2) });
            this.context.addFailure(error.message || "Unknown error", entry, error.details);
          } else {
            this.context.addFailure(error.message || "Unknown error", entry);
          }
        }
        this.processedEntries++;
        this.reportProgress(
          0.1 + this.processedEntries / this.totalEntries * 0.9,
          `Processed ${this.processedEntries}/${this.totalEntries} entries`
        );
      }
    }
    this.reportProgress(1, `Import complete. Processed ${this.processedEntries} entries.`);
    return { failures: this.context.getFailures() };
  }
  reportProgress(progress, message) {
    if (this.onProgress) {
      const normalizedProgress = Math.min(Math.max(progress, 0), 1);
      this.onProgress(normalizedProgress, message);
    }
  }
  async processEntry(contentType, entry, model, idField) {
    const context = {
      operation: "import",
      contentType,
      idField
    };
    let documentId = null;
    if (entry.published) {
      logger.debug("Processing published version", context);
      documentId = await this.importVersionData(contentType, entry.published, model, {
        status: "published",
        idField
      });
    }
    if (entry.draft) {
      logger.debug("Processing draft version", context);
      documentId = await this.importVersionData(contentType, entry.draft, model, {
        documentId,
        status: "draft",
        idField
      });
    }
    return documentId;
  }
  async importVersionData(contentType, versionData, model, options) {
    const context = {
      operation: "import",
      contentType,
      status: options.status,
      documentId: options.documentId
    };
    logger.debug("Processing version data", context);
    let { documentId } = options;
    let processedFirstLocale = false;
    const locales = Object.keys(versionData);
    const firstLocale = locales.includes("default") ? "default" : locales[0];
    const firstData = versionData[firstLocale];
    if (!documentId) {
      const filter = options.idField ? { [options.idField]: firstData[options.idField] } : {};
      const existing = await this.services.documents(contentType).findFirst({
        filters: filter,
        status: options.status
      });
      if (existing) {
        logger.debug("Found existing entry", { ...context, idValue: firstData[options.idField] });
      }
      const processedData = await this.processEntryData(firstData, model);
      const sanitizedData = this.sanitizeData(processedData, model);
      if (existing) {
        switch (this.context.options.existingAction) {
          case ExistingAction.Skip:
            if (!this.context.wasDocumentCreatedInThisImport(existing.documentId)) {
              logger.info(`Skipping existing entry`, {
                ...context,
                idField: options.idField,
                idValue: firstData[options.idField]
              });
              return existing.documentId;
            }
            logger.debug("Entry was created in this import, proceeding with update", context);
          case ExistingAction.Update:
            if (options.status === "draft" && !this.context.options.allowDraftOnPublished) {
              const existingPublished = await this.services.documents(contentType).findOne({
                documentId: existing.documentId,
                status: "published"
              });
              if (existingPublished) {
                logger.warn("Cannot apply draft to existing published entry", context);
                this.context.addFailure(
                  `Cannot apply draft to existing published entry`,
                  versionData
                );
                return null;
              }
            }
            logger.debug("Updating existing entry", { ...context, documentId: existing.documentId });
            await this.services.documents(contentType).update({
              documentId: existing.documentId,
              locale: firstLocale === "default" ? void 0 : firstLocale,
              data: sanitizedData,
              status: options.status
            });
            documentId = existing.documentId;
            this.context.recordUpdated(contentType, firstData[options.idField], existing.documentId);
            processedFirstLocale = true;
            break;
          case ExistingAction.Warn:
          default:
            logger.warn("Entry already exists", {
              ...context,
              idField: options.idField,
              idValue: firstData[options.idField]
            });
            this.context.addFailure(
              `Entry with ${options.idField ?? contentType}=${firstData[options.idField] ?? "SINGLE_TYPE"} already exists`,
              versionData
            );
            return null;
        }
      } else {
        logger.debug("Creating new entry", context);
        const created = await this.services.documents(contentType).create({
          data: sanitizedData,
          status: options.status,
          locale: firstLocale === "default" ? void 0 : firstLocale
        });
        documentId = created.documentId;
        this.context.recordCreated(contentType, firstData[options.idField], created.documentId);
        processedFirstLocale = true;
      }
    }
    for (const locale of locales) {
      const localeContext = {
        ...context,
        locale,
        documentId
      };
      if (processedFirstLocale && locale === firstLocale) continue;
      const localeData = versionData[locale];
      if (this.context.options.existingAction === ExistingAction.Skip && documentId) {
        if (!this.context.wasDocumentCreatedInThisImport(documentId)) {
          if (!this.context.options.allowLocaleUpdates) {
            logger.debug(`Skipping update for existing entry`, localeContext);
            continue;
          }
          const existingLocales = /* @__PURE__ */ new Set();
          logger.debug("Checking existing locales", localeContext);
          const [publishedVersion, draftVersion] = await Promise.all([
            this.services.documents(contentType).findOne({
              documentId,
              status: "published"
            }),
            this.services.documents(contentType).findOne({
              documentId,
              status: "draft"
            })
          ]);
          [publishedVersion, draftVersion].forEach((version) => {
            if (version) {
              existingLocales.add(version.locale || "default");
              version.localizations?.forEach(
                (loc) => existingLocales.add(loc.locale)
              );
            }
          });
          if (existingLocales.has(locale === "default" ? "default" : locale)) {
            logger.debug(`Skipping existing locale`, localeContext);
            continue;
          }
          logger.info(`Creating new locale for existing entry`, localeContext);
        }
      }
      logger.debug(`Processing locale data`, localeContext);
      const processedLocale = await this.processEntryData(localeData, model);
      const sanitizedLocaleData = this.sanitizeData(processedLocale, model);
      await this.services.documents(contentType).update({
        documentId,
        locale: locale === "default" ? void 0 : locale,
        data: sanitizedLocaleData,
        status: options.status
      });
    }
    return documentId;
  }
  async processEntryData(data, model) {
    try {
      const processed = { ...data };
      for (const [key, attr] of Object.entries(model.attributes)) {
        if (!data[key]) continue;
        try {
          if (key === "localizations") {
            delete processed[key];
            continue;
          }
          if (isRelationAttribute(attr)) {
            if (Array.isArray(data[key])) {
              const documentIds = await Promise.all(
                data[key].map(async (value) => {
                  try {
                    return await this.processRelation(value, attr);
                  } catch (error) {
                    console.error(`Failed to process relation array item`, error);
                    this.context.addFailure(
                      `Failed to process relation in ${key}: ${error.message}`,
                      { value, attribute: key }
                    );
                    return null;
                  }
                })
              );
              processed[key] = documentIds.filter((id) => id !== null);
            } else {
              try {
                processed[key] = await this.processRelation(data[key], attr);
              } catch (error) {
                console.error(`Failed to process relation`, error);
                this.context.addFailure(
                  `Failed to process relation in ${key}: ${error.message}`,
                  { value: data[key], attribute: key }
                );
                processed[key] = null;
              }
            }
          } else if (isComponentAttribute(attr)) {
            try {
              processed[key] = await this.processComponent(data[key], attr);
            } catch (error) {
              console.error(`Failed to process component`, error);
              this.context.addFailure(
                `Failed to process component in ${key}: ${error.message}`,
                { value: data[key], attribute: key }
              );
              processed[key] = null;
            }
          } else if (isDynamicZoneAttribute(attr)) {
            processed[key] = await this.processDynamicZone(
              data[key]
            );
          } else if (isMediaAttribute(attr)) {
            const allowedTypes = attr.allowedTypes || ["any"];
            processed[key] = await this.processMedia(data[key], allowedTypes);
          }
        } catch (error) {
          console.error(`Failed to process attribute ${key}`, error);
          this.context.addFailure(
            `Failed to process attribute ${key}: ${error.message}`,
            { value: data[key], attribute: key }
          );
          processed[key] = null;
        }
      }
      return processed;
    } catch (error) {
      console.error(`Failed to process entry data`, error);
      this.context.addFailure(
        `Failed to process entry data: ${error.message}`,
        data
      );
      throw error;
    }
  }
  async processRelation(relationValue, attr) {
    const context = {
      operation: "import",
      contentType: attr.target,
      relation: relationValue
    };
    if (!relationValue) {
      logger.debug("Skipping null relation", context);
      return null;
    }
    try {
      const targetModel = getModel(attr.target);
      if (!targetModel) {
        logger.warn(`Target model not found`, context);
        throw new Error(`Target model ${attr.target} not found`);
      }
      const targetIdField = getIdentifierField(targetModel);
      logger.debug(`Processing relation with identifier field: ${targetIdField}`, context);
      const documentId = this.context.findProcessedRecord(attr.target, relationValue);
      if (documentId) {
        logger.debug("Found previously processed relation", { ...context, documentId });
        return documentId;
      }
      if (this.context.options.disallowNewRelations && this.context.options.existingAction === ExistingAction.Skip) {
        logger.debug("Skipping database lookup (disallowNewRelations enabled)", context);
        return null;
      }
      logger.debug("Looking for relation in import data", context);
      if (this.context.importData[attr.target]) {
        logger.debug("Found target in import data", context);
        const targetEntry = this.findEntryInImportData(
          relationValue,
          targetIdField,
          this.context.importData[attr.target]
        );
        if (targetEntry) {
          const publishedIdValue = targetEntry.published?.default?.[targetIdField];
          const draftIdValue = targetEntry.draft?.default?.[targetIdField];
          if (publishedIdValue && draftIdValue && publishedIdValue !== draftIdValue) {
            if (this.context.options.disallowNewRelations && this.context.options.existingAction === ExistingAction.Skip) {
              logger.debug(`Skipping database lookup for relation ${attr.target}:${publishedIdValue} (disallowNewRelations is true)`);
              return null;
            }
            const dbRecord2 = await this.findInDatabase(publishedIdValue, targetModel, targetIdField);
            if (dbRecord2) {
              logger.debug("Found relation in database", { ...context, documentId: dbRecord2.documentId });
              return dbRecord2.documentId;
            }
          }
          logger.debug(`Relation type: ${attr.relation}`);
          if (attr.relation === "oneWay" || attr.relation === "manyWay" || attr.relation === "oneToOne") {
            logger.debug(`Processing related entry from import data: ${attr.target} ${relationValue}`);
            return await this.processEntry(
              attr.target,
              targetEntry,
              targetModel,
              targetIdField
            );
          }
        }
      } else {
        logger.debug("No target in import data", context);
      }
      if (this.context.options.disallowNewRelations && this.context.options.existingAction === ExistingAction.Skip) {
        logger.debug(`Skipping database lookup for relation ${attr.target}:${relationValue} (disallowNewRelations is true)`);
        return null;
      }
      const dbRecord = await this.findInDatabase(relationValue, targetModel, targetIdField);
      if (dbRecord) {
        logger.debug("Found relation in database", { ...context, documentId: dbRecord.documentId });
      } else {
        logger.warn("Relation not found in database", context);
      }
      return dbRecord?.documentId || null;
    } catch (error) {
      logger.error(`Failed to process relation`, context, error);
      this.context.addFailure(
        `Failed to process relation to ${attr.target}: ${error.message}`,
        { value: relationValue, attribute: attr }
      );
      return null;
    }
  }
  async findInDatabase(idValue, targetModel, targetIdField) {
    const context = {
      operation: "import",
      contentType: targetModel.uid,
      idField: targetIdField,
      idValue
    };
    logger.debug("Looking up record in database", context);
    const publishedVersion = await this.services.documents(targetModel.uid).findFirst({
      filters: { [targetIdField]: idValue },
      status: "published"
    });
    const draftVersion = await this.services.documents(targetModel.uid).findFirst({
      filters: { [targetIdField]: idValue },
      status: "draft"
    });
    if (publishedVersion && draftVersion) {
      if (publishedVersion.documentId === draftVersion.documentId) {
        logger.debug("Found matching published and draft versions", {
          ...context,
          documentId: publishedVersion.documentId
        });
        return publishedVersion;
      }
      logger.warn("Found conflicting published and draft versions", {
        ...context,
        publishedId: publishedVersion.documentId,
        draftId: draftVersion.documentId
      });
      return publishedVersion;
    }
    if (publishedVersion || draftVersion) {
      logger.debug("Found single version", {
        ...context,
        status: publishedVersion ? "published" : "draft",
        documentId: (publishedVersion || draftVersion).documentId
      });
    } else {
      logger.debug("Record not found in database", context);
    }
    return publishedVersion || draftVersion;
  }
  async processComponent(value, attr) {
    if (Array.isArray(value)) {
      return Promise.all(
        value.map(
          (item) => this.processComponentItem(item, attr.component)
        )
      );
    }
    return this.processComponentItem(value, attr.component);
  }
  async processComponentItem(item, componentType) {
    const processed = { ...item };
    const componentModel = getModel(componentType);
    for (const [key, attr] of Object.entries(componentModel.attributes)) {
      if (!item[key]) continue;
      if (isMediaAttribute(attr)) {
        const allowedTypes = attr.allowedTypes || ["any"];
        processed[key] = await this.processMedia(item[key], allowedTypes);
      } else if (isRelationAttribute(attr)) {
        processed[key] = await this.processRelation(
          item[key],
          attr
        );
      }
    }
    return processed;
  }
  async processDynamicZone(items) {
    return Promise.all(
      items.map(async (item) => ({
        __component: item.__component,
        ...await this.processComponentItem(
          item,
          item.__component
        )
      }))
    );
  }
  async processMedia(value, allowedTypes = ["any"]) {
    const context = {
      operation: "import",
      mediaType: Array.isArray(value) ? "array" : "single",
      allowedTypes
    };
    if (Array.isArray(value)) {
      logger.debug("Processing media array", context);
      const media = [];
      for (const item of value) {
        logger.debug("Processing media item", { ...context, url: item });
        const file = await findOrImportFile(item, this.context.user, { allowedFileTypes: allowedTypes });
        if (file) {
          logger.debug("Media file processed", { ...context, fileId: file.id });
          media.push(file.id);
        } else {
          logger.warn("Failed to process media file", { ...context, url: item });
        }
      }
      return media;
    } else {
      logger.debug("Processing single media item", { ...context, url: value });
      const file = await findOrImportFile(value, this.context.user, { allowedFileTypes: allowedTypes });
      if (file) {
        logger.debug("Media file processed", { ...context, fileId: file.id });
        return file.id;
      }
      logger.warn("Failed to process media file", { ...context, url: value });
      return null;
    }
  }
  findEntryInImportData(relationValue, targetIdField, targetEntries) {
    return targetEntries.find((entry) => {
      if (entry.draft) {
        const draftMatch = Object.values(entry.draft).some(
          (localeData) => localeData[targetIdField] === relationValue
        );
        if (draftMatch) return true;
      }
      if (entry.published) {
        return Object.values(entry.published).some(
          (localeData) => localeData[targetIdField] === relationValue
        );
      }
      return false;
    }) || null;
  }
  sanitizeData(data, model) {
    const context = {
      operation: "import",
      contentType: model.uid
    };
    if (!data || typeof data !== "object") {
      logger.debug("Skipping sanitization for non-object data", context);
      return data;
    }
    logger.debug("Sanitizing data", context);
    const sanitized = { ...data };
    const validAttributes = Object.entries(model.attributes).filter(([_2, attr]) => attr.configurable !== false);
    const validAttributeNames = new Set(validAttributes.map(([name]) => name));
    for (const key of Object.keys(sanitized)) {
      if (!validAttributeNames.has(key)) {
        logger.debug(`Removing invalid field: ${key}`, context);
        delete sanitized[key];
      }
    }
    return sanitized;
  }
}
class SSEManager {
  constructor() {
    this.client = null;
    this.currentJob = {
      status: "idle",
      message: "",
      progress: 0
    };
  }
  setClient(client) {
    this.client = client;
    if (this.client && this.currentJob.status !== "idle") {
      this.client.send("status", this.currentJob);
    }
  }
  clearClient() {
    this.client = null;
  }
  updateStatus(status, message, progress) {
    this.currentJob = {
      status,
      message: message || "",
      progress: progress || 0
    };
    if (this.client) {
      this.client.send("status", this.currentJob);
    }
  }
  sendComplete(result) {
    getService("import").setImportInProgress(false);
    if (this.client) {
      this.client.send("complete", result);
      setTimeout(() => {
        this.updateStatus("idle", "", 0);
        this.client?.send("close", {});
      }, 1e3);
    }
  }
  sendError(error) {
    getService("import").setImportInProgress(false);
    if (this.client) {
      this.client.send("error", {
        message: error.message,
        stack: error.stack
      });
    }
  }
}
const sseManager = new SSEManager();
var ExistingAction = /* @__PURE__ */ ((ExistingAction2) => {
  ExistingAction2["Warn"] = "warn";
  ExistingAction2["Update"] = "update";
  ExistingAction2["Skip"] = "skip";
  return ExistingAction2;
})(ExistingAction || {});
async function importDataV3(fileContent, {
  slug,
  user,
  allowDraftOnPublished = true,
  existingAction = "warn",
  ignoreMissingRelations = false,
  allowLocaleUpdates = false,
  disallowNewRelations = true
}, progressOptions) {
  const context = {
    operation: "import",
    slug
  };
  const { useSSE = false } = progressOptions || {};
  if (!fileContent.data) {
    logger.error("No data found in file", context);
    throw new Error("No data found in file");
  }
  if (useSSE) {
    sseManager.updateStatus("validating", "Validating data structure...", 10);
  }
  const validationResult = await validateFileContent(fileContent, {
    existingAction,
    ignoreMissingRelations
  });
  if (!validationResult.isValid) {
    const errors = validationResult.errors.map((error) => {
      logger.error("Validation failed", {
        ...context,
        error: error.message,
        path: error.path
      });
      return {
        error: error.message,
        data: {
          entry: error.entry,
          path: error.path ? error.path.join(".") : void 0
        }
      };
    });
    if (useSSE) {
      sseManager.updateStatus("error", "Validation failed", 0);
    }
    return { errors };
  }
  logger.debug("Validation passed, creating import context", context);
  if (useSSE) {
    setTimeout(async () => {
      try {
        sseManager.updateStatus("processing", "Creating import context...", 30);
        const importContext2 = new ImportContext(
          {
            existingAction,
            allowDraftOnPublished,
            ignoreMissingRelations,
            allowLocaleUpdates,
            disallowNewRelations
          },
          fileContent.data,
          user
        );
        const processor2 = new ImportProcessor(
          importContext2,
          {
            documents: strapi.documents
          },
          (progress, message) => {
            sseManager.updateStatus("processing", message, 30 + Math.floor(progress * 70));
          }
        );
        logger.info("Starting import processing", context);
        sseManager.updateStatus("processing", "Starting data import...", 40);
        const result = await processor2.process();
        sseManager.sendComplete(result);
      } catch (error) {
        logger.error("Import processing error", {
          ...context,
          error: error.message,
          stack: error.stack
        });
        sseManager.updateStatus("error", error.message, 0);
        sseManager.sendError(error);
      }
    }, 100);
    return { backgroundProcessing: true };
  }
  const importContext = new ImportContext(
    {
      existingAction,
      allowDraftOnPublished,
      ignoreMissingRelations,
      allowLocaleUpdates,
      disallowNewRelations
    },
    fileContent.data,
    user
  );
  const processor = new ImportProcessor(importContext, {
    documents: strapi.documents
  });
  logger.info("Starting import processing", context);
  return processor.process();
}
let importInProgress = false;
const isImportInProgress = () => {
  return importInProgress;
};
const setImportInProgress = (status) => {
  importInProgress = status;
};
const setSSEClient = (client) => {
  sseManager.setClient(client);
};
const clearSSEClient = () => {
  sseManager.clearClient();
};
const wrappedImportDataV3 = async (fileContent, options, progressOptions) => {
  if (progressOptions?.useSSE && importInProgress) {
    throw new Error("An import is already in progress");
  }
  if (progressOptions?.useSSE) {
    setImportInProgress(true);
    try {
      const result = await importDataV3(fileContent, options, progressOptions);
      if (!result.backgroundProcessing) {
        setImportInProgress(false);
      }
      return result;
    } catch (error) {
      setImportInProgress(false);
      throw error;
    }
  } else {
    return importDataV3(fileContent, options, progressOptions);
  }
};
const importService = {
  importData,
  importDataV2,
  parseInputData,
  isImportInProgress,
  setImportInProgress,
  setSSEClient,
  clearSSEClient,
  importDataV3: wrappedImportDataV3
};
const services = {
  export: exportService,
  import: importService
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
module.exports = index;
