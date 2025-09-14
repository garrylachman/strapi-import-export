"use strict";
const React = require("react");
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@strapi/icons");
const designSystem = require("@strapi/design-system");
const styled = require("styled-components");
const reactSingletonHook = require("react-singleton-hook");
const reactRouterDom = require("react-router-dom");
const reactIntl = require("react-intl");
const strapiAdmin = require("@strapi/admin/strapi-admin");
const eventsource = require("eventsource");
const reactRedux = require("react-redux");
const CodeMirror = require("@uiw/react-codemirror");
const admin = require("@strapi/strapi/admin");
const pick = require("lodash/pick");
const range = require("lodash/range");
const qs = require("qs");
const strapiAdmin$1 = require("@strapi/content-manager/strapi-admin");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const React__default = /* @__PURE__ */ _interopDefault(React);
const styled__default = /* @__PURE__ */ _interopDefault(styled);
const CodeMirror__default = /* @__PURE__ */ _interopDefault(CodeMirror);
const pick__default = /* @__PURE__ */ _interopDefault(pick);
const range__default = /* @__PURE__ */ _interopDefault(range);
const qs__default = /* @__PURE__ */ _interopDefault(qs);
const PLUGIN_ID = "strapi-import-export";
const Initializer = ({ setPlugin }) => {
  const ref = React.useRef(setPlugin);
  React.useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.Database, {});
const pluginPermissions = {
  main: [
    { action: `plugin::${PLUGIN_ID}.export`, subject: null },
    { action: `plugin::${PLUGIN_ID}.import`, subject: null }
  ]
};
const init = { alerts: [], notify: () => {
}, removeAlert: () => {
}, loading: true };
const useAlertsImpl = () => {
  const [alerts, setAlerts] = React.useState([]);
  const [idCount, setIdCount] = React.useState(0);
  const alertsRef = React.useRef(alerts);
  alertsRef.current = alerts;
  const notify = (title, message, variant = "default") => {
    const alert = {
      id: idCount,
      timeout: setTimeout(() => removeAlert(idCount), 8e3),
      variant,
      title,
      message
    };
    setAlerts(alerts.concat(alert));
    setIdCount(idCount + 1);
  };
  const removeAlert = (id) => {
    const alerts2 = alertsRef.current;
    const alert = alerts2.find((a) => a.id === id);
    if (alert) {
      clearTimeout(alert.timeout);
    }
    const alertsFiltered = alerts2.filter((a) => a.id !== id);
    setAlerts(alertsFiltered);
  };
  return {
    alerts,
    notify,
    removeAlert
  };
};
const useAlerts = reactSingletonHook.singletonHook(init, useAlertsImpl);
const AlertWrapper = styled__default.default.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 10000;
  padding: 16px;

  & > *:not(:first-child) {
    margin-top: 16px;
  }
`;
const Alerts = () => {
  const { alerts, removeAlert } = useAlerts();
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Portal, { children: /* @__PURE__ */ jsxRuntime.jsx(AlertWrapper, { children: alerts?.map(({ id, title, message, variant }) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.Alert, { closeLabel: "Close", title, variant, onClose: () => removeAlert(id), children: message }, id)) }) });
};
const getTrad = (id) => `${PLUGIN_ID}.${id}`;
const useI18n = () => {
  const { formatMessage } = reactIntl.useIntl();
  const i18n = (key, defaultMessage = void 0) => {
    return formatMessage({
      id: getTrad(key),
      defaultMessage
    });
  };
  return {
    i18n
  };
};
const SLUG_WHOLE_DB = "custom:db";
const useSlug = () => {
  const { pathname } = reactRouterDom.useLocation();
  console.log("pathname", pathname);
  const slug = React.useMemo(() => {
    const matches = pathname.match(/content-manager\/(collection-types|single-types)\/([a-zA-Z0-9\-:_.]*)/);
    return matches?.[2] ? matches[2] : SLUG_WHOLE_DB;
  }, [pathname]);
  const isSlugWholeDb = React.useMemo(() => slug === SLUG_WHOLE_DB, [slug]);
  return {
    slug,
    isSlugWholeDb
  };
};
const dataFormats = {
  CSV: "csv",
  JSON: "json",
  JSON_V2: "json-v2",
  JSON_V3: "json-v3"
};
const dataFormatConfigs = {
  [dataFormats.CSV]: {
    fileExt: "csv",
    fileContentType: "text/csv",
    language: "csv"
  },
  [dataFormats.JSON]: {
    fileExt: "json",
    fileContentType: "application/json",
    language: "json"
  },
  [dataFormats.JSON_V2]: {
    fileExt: "json",
    fileContentType: "application/json",
    language: "json"
  },
  [dataFormats.JSON_V3]: {
    fileExt: "json",
    fileContentType: "application/json",
    language: "json"
  }
};
const handleRequestErr = (err, handlers) => {
  const defaultHandler = handlers.default || (() => {
  });
  const { name: errorName, status: errorStatus } = err.response?.data.error || {};
  const handler = handlers[errorName] || handlers[errorStatus] || defaultHandler;
  handler(err);
};
const Editor = ({
  content = "",
  language = "json",
  readOnly = false,
  onChange,
  style
}) => {
  const [codeMirrorContent, setCodeMirrorContent] = React.useState("");
  React.useEffect(() => {
    console.log("content", content);
    if (typeof content === "object") {
      if (content.data) {
        setCodeMirrorContent(content.data);
      } else {
        setCodeMirrorContent(JSON.stringify(content, null, 2));
      }
    } else {
      setCodeMirrorContent(content);
    }
  }, [content, language]);
  return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx(
    CodeMirror__default.default,
    {
      className: "plugin-ie-editor",
      basicSetup: { lineNumbers: true },
      readOnly: false,
      style,
      height: "40vh",
      theme: "dark",
      value: codeMirrorContent,
      onChange,
      editable: !readOnly
    }
  ) });
};
const useForm = (attributes) => {
  const [options, setOptions] = React.useState(attributes);
  const getOption = (key) => {
    return options[key];
  };
  const setOption = (key, value) => {
    setOptions({ ...options, [key]: value });
  };
  return { options, getOption, setOption };
};
const ImportEditor = ({
  file,
  data,
  dataFormat,
  slug,
  onDataChanged,
  onOptionsChanged,
  version
}) => {
  const { i18n } = useI18n();
  const [attributeNames, setAttributeNames] = React.useState([]);
  const fetchClient = strapiAdmin.useFetchClient();
  const { options, getOption, setOption } = useForm({
    idField: "id",
    existingAction: "warn",
    ignoreMissingRelations: false,
    allowLocaleUpdates: false,
    disallowNewRelations: false
  });
  const getCookieValue = (name) => {
    let result = null;
    const cookieArray = document.cookie.split(";");
    console.log("cookieArray", cookieArray);
    cookieArray.forEach((cookie) => {
      console.log("cookie", cookie);
      const [key, value] = cookie.split("=").map((item) => item.trim());
      if (key === name) {
        result = decodeURIComponent(value);
      }
    });
    return result;
  };
  const getToken = () => {
    const fromLocalStorage = localStorage.getItem("jwtToken");
    if (fromLocalStorage) {
      return JSON.parse(fromLocalStorage);
    }
    const fromSessionStorage = sessionStorage.getItem("jwtToken");
    if (fromSessionStorage) {
      return JSON.parse(fromSessionStorage);
    }
    const fromCookie = getCookieValue("jwtToken");
    return fromCookie ?? null;
  };
  React.useEffect(() => {
    if (options.existingAction === "skip") {
      setOption("disallowNewRelations", true);
    }
  }, [options.existingAction]);
  React.useEffect(() => {
    const fetchAttributeNames = async () => {
      const { get } = fetchClient;
      console.log("slug", slug);
      try {
        const resData = await get(`/${PLUGIN_ID}/import/model-attributes/${slug}`, { headers: { "Authorization": `Bearer ${getToken()}` } });
        console.log("resData", resData);
        setAttributeNames(resData?.data?.data?.attribute_names);
      } catch (error) {
        console.error("Error fetching attribute names:", error);
      }
    };
    fetchAttributeNames();
  }, [fetchClient, slug]);
  React.useEffect(() => {
    onOptionsChanged(options);
  }, [options]);
  console.log("attributeNames", attributeNames);
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Root, { defaultValue: "file", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.List, { "aria-label": "Import editor", children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "file", children: i18n("plugin.import.tab.file") }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "options", children: i18n("plugin.import.tab.options") })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "file", children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 4, children: [
      file?.name && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { paddingTop: 2, paddingBottom: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { fontWeight: "bold", as: "span", children: [
          i18n("plugin.import.file-name"),
          ":"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { as: "span", children: [
          " ",
          file.name
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { marginTop: 2, children: /* @__PURE__ */ jsxRuntime.jsx(Editor, { content: data, language: dataFormat, onChange: onDataChanged }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "options", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Grid.Root, { gap: 4, marginTop: 2, children: [
      version !== 3 && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.form.field.id-field.hint"), children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: i18n("plugin.form.field.id-field.label") }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {}),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.SingleSelect,
          {
            onChange: (value) => setOption("idField", value),
            value: getOption("idField"),
            placeholder: i18n("plugin.form.field.id-field.placeholder"),
            children: attributeNames?.length > 0 ? attributeNames.map((name) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: name, children: name }, name)) : /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "", children: "No attribute found" })
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.form.field.existing-action.hint"), children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: i18n("plugin.form.field.existing-action.label") }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {}),
        /* @__PURE__ */ jsxRuntime.jsxs(
          designSystem.SingleSelect,
          {
            onChange: (value) => setOption("existingAction", value),
            value: getOption("existingAction"),
            placeholder: i18n("plugin.form.field.existing-action.placeholder"),
            children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "warn", children: "Warn" }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "skip", children: "Skip" }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: "update", children: "Update" })
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.form.field.ignore-missing-relations.hint"), children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Checkbox,
          {
            checked: getOption("ignoreMissingRelations"),
            onCheckedChange: (value) => setOption("ignoreMissingRelations", value === true),
            children: i18n("plugin.form.field.ignore-missing-relations.label")
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
      ] }) }),
      options.existingAction === "skip" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.form.field.allow-locale-updates.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: getOption("allowLocaleUpdates"),
              onCheckedChange: (value) => setOption("allowLocaleUpdates", value === true),
              children: i18n("plugin.form.field.allow-locale-updates.label")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.form.field.disallow-new-relations.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: getOption("disallowNewRelations"),
              onCheckedChange: (value) => setOption("disallowNewRelations", value === true),
              children: i18n("plugin.form.field.disallow-new-relations.label")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }) })
      ] })
    ] }) }) })
  ] });
};
const Label = styled__default.default.label`
  --hover-color: hsl(210, 100%, 50%);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  flex: 1;
  height: 260px;
  padding: 48px;
  border-width: 3px;
  border-color: #ddd;
  border-radius: 12px;
  cursor: pointer;
  border-style: dashed;
  text-align: center;
  &:hover {
    border-color: var(--hover-color);
  }

  & > *:not(:first-child) {
    margin-top: 16px;
  }

  input {
    display: none;
  }
`;
const IconWrapper = styled__default.default.span`
  height: 100px;
  svg {
    width: 6rem;
    height: 6rem;
    color: #C0C0CF;
  }
    display: flex;
    flex-direction: column;
    justify-content: center;
`;
const DragOverLabel = styled__default.default(Label)`
  &.dragged-over {
    border-color: var(--hover-color);

    &::after {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 5;
    }
  }
`;
const ModalState = {
  SUCCESS: "success",
  PARTIAL: "partial",
  ERROR: "error",
  UNSET: "unset"
};
const ImportModal = ({ onClose }) => {
  const { i18n } = useI18n();
  const { formatMessage } = reactIntl.useIntl();
  const { slug } = useSlug();
  const { notify } = useAlerts();
  reactRouterDom.useNavigate();
  const [file, setFile] = React.useState({});
  const [data, setData] = React.useState("");
  const [options, setOptions] = React.useState({});
  const [dataFormat, setDataFormat] = React.useState(dataFormats.CSV);
  const [labelClassNames, setLabelClassNames] = React.useState("plugin-ie-import_modal_input-label");
  const [uploadSuccessful, setUploadSuccessful] = React.useState(ModalState.UNSET);
  const [uploadingData, setUploadingData] = React.useState(false);
  const [importFailuresContent, setImportFailuresContent] = React.useState("");
  const [importErrorsContent, setImportErrorsContent] = React.useState("");
  const [parsedData, setParsedData] = React.useState(null);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importStatus, setImportStatus] = React.useState("idle");
  const [importMessage, setImportMessage] = React.useState("");
  const [sseConnection, setSseConnection] = React.useState(null);
  const dispatch = reactRedux.useDispatch();
  const handleDataChanged = (newData) => {
    try {
      const parsed = JSON.parse(newData);
      setParsedData(parsed);
      setData(newData);
    } catch (e) {
      setParsedData(null);
      setData(newData);
    }
  };
  const onReadFile = (e) => {
    const file2 = e.target.files[0];
    readFile(file2);
    setFile(file2);
  };
  const readFile = (file2) => {
    if (file2.type === "text/csv" || /\.csv$/i.test(file2.name)) {
      setDataFormat(dataFormats.CSV);
    } else if (file2.type === "application/json" || /\.json$/i.test(file2.name)) {
      setDataFormat(dataFormats.JSON);
    } else {
      throw new Error(`File type ${file2.type} not supported.`);
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      setData(text);
    };
    reader.readAsText(file2);
  };
  const openCodeEditor = () => {
    setData("{\n	\n}");
    setDataFormat(dataFormats.JSON);
  };
  const resetDataSource = () => {
    setData("");
    setDataFormat(dataFormats.CSV);
    setUploadSuccessful(ModalState.UNSET);
    setFile({});
  };
  const getCookieValue = (name) => {
    let result = null;
    const cookieArray = document.cookie.split(";");
    cookieArray.forEach((cookie) => {
      console.log("cookie", cookie);
      const [key, value] = cookie.split("=").map((item) => item.trim());
      if (key === name) {
        result = decodeURIComponent(value);
      }
    });
    return result;
  };
  const getToken = () => {
    const fromLocalStorage = localStorage.getItem("jwtToken");
    if (fromLocalStorage) {
      return JSON.parse(fromLocalStorage);
    }
    const fromSessionStorage = sessionStorage.getItem("jwtToken");
    if (fromSessionStorage) {
      return JSON.parse(fromSessionStorage);
    }
    const fromCookie = getCookieValue("jwtToken");
    return fromCookie ?? null;
  };
  const fetchClient = strapiAdmin.useFetchClient();
  const connectToSSE = () => {
    const backendURL = window.strapi.backendURL;
    const addPrependingSlash = (url2) => url2.charAt(0) !== "/" ? `/${url2}` : url2;
    const hasProtocol = (url2) => new RegExp("^(?:[a-z+]+:)?//", "i").test(url2);
    const normalizeUrl = (url2) => hasProtocol(url2) ? url2 : addPrependingSlash(url2);
    const addBaseUrl = (url2) => {
      return `${backendURL}${url2}`;
    };
    const url = normalizeUrl(`/${PLUGIN_ID}/import/progress`);
    const fullUrl = addBaseUrl(url);
    if (sseConnection) {
      console.log("Closing existing SSE connection");
      sseConnection.close();
    }
    const eventSource = new eventsource.EventSource(fullUrl, {
      fetch: (input, init2) => fetch(input, {
        ...init2,
        headers: {
          ...init2.headers,
          "Authorization": `Bearer ${getToken()}`
        }
      })
    });
    eventSource.addEventListener("connected", (e) => {
      console.log("SSE connected:", e.data);
    });
    eventSource.addEventListener("status", (e) => {
      const data2 = JSON.parse(e.data);
      setImportStatus(data2.status);
      setImportMessage(data2.message || "");
      if (data2.progress !== void 0) {
        setImportProgress(data2.progress);
      }
      if (data2.status === "processing" || data2.status === "validating") {
        setUploadingData(true);
      }
    });
    eventSource.addEventListener("complete", (e) => {
      const result = JSON.parse(e.data);
      setUploadingData(false);
      if (!result.failures?.length && !result.errors?.length) {
        setUploadSuccessful(ModalState.SUCCESS);
        notify(
          i18n("plugin.message.import.success.imported.title"),
          i18n("plugin.message.import.success.imported.message"),
          "success"
        );
        refreshView();
      } else if (result.failures?.length) {
        setUploadSuccessful(ModalState.PARTIAL);
        setImportFailuresContent(JSON.stringify(result.failures, null, "	"));
        notify(
          i18n("plugin.message.import.error.imported-partial.title"),
          i18n("plugin.message.import.error.imported-partial.message"),
          "danger"
        );
      } else if (result.errors?.length) {
        setUploadSuccessful(ModalState.ERROR);
        setImportErrorsContent(JSON.stringify(result.errors, null, "	"));
      }
    });
    eventSource.addEventListener("error", (e) => {
      try {
        const data2 = JSON.parse(e.data);
        console.error("Import error:", data2);
        setUploadingData(false);
        setUploadSuccessful(ModalState.ERROR);
        setImportErrorsContent(JSON.stringify([{
          error: data2.message,
          data: { entry: {}, path: "" }
        }], null, "	"));
      } catch (err) {
        console.error("SSE error event (not JSON):", e);
      }
    });
    eventSource.addEventListener("close", () => {
      eventSource.close();
      setSseConnection(null);
    });
    eventSource.onerror = (e) => {
      console.error("SSE connection error:", e);
      if (importStatus === "processing" || importStatus === "validating") {
        setUploadingData(false);
        setUploadSuccessful(ModalState.ERROR);
        setImportErrorsContent(JSON.stringify([{
          error: "SSE connection error",
          data: { entry: {}, path: "" }
        }], null, "	"));
      }
      eventSource.close();
      setSseConnection(null);
    };
    setSseConnection(eventSource);
  };
  const uploadData = async () => {
    setUploadingData(true);
    try {
      const { post } = fetchClient;
      const res = await post(`/${PLUGIN_ID}/import`, {
        data: { slug, data, format: dataFormat, ...options }
      }, { headers: { "Authorization": `Bearer ${getToken()}` } });
      if (res.data.status === "error") {
        notify(
          i18n("plugin.message.import.error.unexpected.title"),
          res.data.message,
          "danger"
        );
        setUploadingData(false);
        return;
      }
      if (res.data.status === "started" && res.data.useSSE) {
        console.log("Should connect to SSE");
        connectToSSE();
        return;
      }
      const { failures, errors } = res.data;
      if (!failures?.length && !errors?.length) {
        setUploadSuccessful(ModalState.SUCCESS);
        notify(
          i18n("plugin.message.import.success.imported.title"),
          i18n("plugin.message.import.success.imported.message"),
          "success"
        );
        refreshView();
      } else if (failures?.length) {
        setUploadSuccessful(ModalState.PARTIAL);
        setImportFailuresContent(JSON.stringify(failures, null, "	"));
        notify(
          i18n("plugin.message.import.error.imported-partial.title"),
          i18n("plugin.message.import.error.imported-partial.message"),
          "danger"
        );
      } else if (errors?.length) {
        setUploadSuccessful(ModalState.ERROR);
        setImportErrorsContent(JSON.stringify(errors, null, "	"));
      }
      setUploadingData(false);
    } catch (err) {
      console.log("err", err);
      handleRequestErr(err, {
        403: () => notify(
          i18n("plugin.message.import.error.forbidden.title"),
          i18n("plugin.message.import.error.forbidden.message"),
          "danger"
        ),
        409: () => notify(
          "Import in progress",
          "Another import is already in progress. Please wait for it to complete.",
          "danger"
        ),
        413: () => notify(
          i18n("plugin.message.import.error.payload-too-large.title"),
          i18n("plugin.message.import.error.payload-too-large.message"),
          "danger"
        ),
        default: () => notify(
          i18n("plugin.message.import.error.unexpected.title"),
          i18n("plugin.message.import.error.unexpected.message"),
          "danger"
        )
      });
      setUploadingData(false);
    }
  };
  const refreshView = () => {
    dispatch(strapiAdmin.adminApi.util.invalidateTags([
      "Document",
      "HistoryVersion",
      "Relations",
      "UidAvailability",
      "RecentDocumentList"
    ]));
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLabelClassNames(
      [labelClassNames, "plugin-ie-import_modal_input-label--dragged-over"].join(" ")
    );
  };
  const handleDragLeave = () => {
    setLabelClassNames(
      labelClassNames.replaceAll("plugin-ie-import_modal_input-label--dragged-over", "")
    );
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave();
    const file2 = e.dataTransfer.files[0];
    readFile(file2);
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(data);
    notify("Copied", "", "success");
  };
  const showLoader = uploadingData;
  const showFileDragAndDrop = !uploadingData && uploadSuccessful === ModalState.UNSET && !data;
  const showEditor = !uploadingData && uploadSuccessful === ModalState.UNSET && data;
  const showSuccess = !uploadingData && uploadSuccessful === ModalState.SUCCESS;
  const showPartialSuccess = !uploadingData && uploadSuccessful === ModalState.PARTIAL;
  const showError = !uploadingData && uploadSuccessful === ModalState.ERROR;
  const showImportButton = showEditor;
  const showRemoveFileButton = showEditor || showError || showPartialSuccess;
  React.useEffect(() => {
    return () => {
      if (sseConnection) {
        sseConnection.close();
      }
    };
  }, [sseConnection]);
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Root, { onClose, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Trigger, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Upload, {}), children: formatMessage({ id: getTrad("plugin.cta.import") }) }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", as: "h2", style: { marginBottom: "16px" }, children: i18n("plugin.cta.import") }) }) }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Body, { children: [
        showFileDragAndDrop && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: "24px" }, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", textColor: "neutral800", children: i18n("plugin.import.data-source-step.title") }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              DragOverLabel,
              {
                className: `plugin-ie-import_modal_label ${labelClassNames}`,
                onDragEnter: handleDragEnter,
                onDragLeave: handleDragLeave,
                onDragOver: handleDragOver,
                onDrop: handleDrop,
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx(IconWrapper, { children: /* @__PURE__ */ jsxRuntime.jsx(icons.File, {}) }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", textColor: "neutral600", children: i18n("plugin.import.drag-drop-file") }),
                  /* @__PURE__ */ jsxRuntime.jsx("input", { type: "file", accept: ".csv,.json", hidden: "", onChange: onReadFile })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsxs(Label, { className: "plugin-ie-import_modal_button-label", onClick: openCodeEditor, children: [
              /* @__PURE__ */ jsxRuntime.jsx(IconWrapper, { children: /* @__PURE__ */ jsxRuntime.jsx(icons.Code, {}) }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", textColor: "neutral600", children: i18n("plugin.import.use-code-editor") })
            ] })
          ] })
        ] }),
        showLoader && /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "center", direction: "column", alignItems: "center", gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: importMessage || i18n("plugin.import.importing-data") }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: `${Math.round(importProgress)}%` }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { width: "100%", padding: 4, children: /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
            width: "100%",
            height: "8px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
            overflow: "hidden"
          }, children: /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
            width: `${importProgress}%`,
            height: "100%",
            backgroundColor: "#4945ff",
            borderRadius: "4px",
            transition: "width 0.3s ease-in-out"
          } }) }) })
        ] }) }),
        showEditor && /* @__PURE__ */ jsxRuntime.jsx(
          ImportEditor,
          {
            file,
            data,
            dataFormat,
            slug,
            onDataChanged: handleDataChanged,
            onOptionsChanged: setOptions,
            version: parsedData?.version
          }
        ),
        showSuccess && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "center", gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsx(icons.CheckCircle, { width: "6rem", height: "6rem", color: "success500" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", textColor: "neutral800", children: i18n("plugin.message.import.success.imported-successfully") }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: onClose, variant: "tertiary", children: i18n("plugin.cta.close") }) })
        ] }),
        showPartialSuccess && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral800", fontWeight: "bold", as: "h2", children: i18n("plugin.import.partially-failed") }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral800", as: "p", children: i18n("plugin.import.detailed-information") }),
          /* @__PURE__ */ jsxRuntime.jsx(Editor, { content: importFailuresContent, language: "json", readOnly: true })
        ] }),
        showError && /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Root, { defaultValue: "errors", children: [
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.List, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "errors", children: "Errors List" }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Trigger, { value: "output", children: "Errors Details" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Tabs.Content, { value: "errors", children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral800", fontWeight: "bold", as: "h2", children: i18n("plugin.import.errors") }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Accordion.Root, { size: "M", children: JSON.parse(importErrorsContent).map((error, index2) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Accordion.Item, { value: `acc-${index2}`, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Accordion.Header, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Accordion.Trigger, { icon: icons.CrossCircle, description: error.data?.path || "", children: error.error }) }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Accordion.Content, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { display: "block", tag: "pre", padding: 4, children: typeof error.data?.entry === "string" ? error.data?.entry : JSON.stringify(error.data?.entry || "", null, 2) }) })
            ] }, index2)) })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Tabs.Content, { value: "output", children: /* @__PURE__ */ jsxRuntime.jsx(Editor, { content: importErrorsContent, language: "json", readOnly: true }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Footer, { children: [
        showRemoveFileButton && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: resetDataSource, variant: "tertiary", children: i18n("plugin.cta.back-to-data-sources") }),
        showImportButton && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: uploadData, children: i18n("plugin.cta.import") }),
        showPartialSuccess && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { variant: "secondary", onClick: copyToClipboard, children: i18n("plugin.cta.copy-to-clipboard") })
      ] })
    ] })
  ] });
};
const en = {
  "strapi-import-export.plugin.name": "Import Export",
  "strapi-import-export.plugin.description": "Import/Export data in just few clicks",
  "strapi-import-export.plugin.cta.back-to-data-sources": "Back To Data Sources",
  "strapi-import-export.plugin.cta.back-to-options": "Back To Options",
  "strapi-import-export.plugin.cta.cancel": "Cancel",
  "strapi-import-export.plugin.cta.close": "Close",
  "strapi-import-export.plugin.cta.copy-to-clipboard": "Copy To Clipboard",
  "strapi-import-export.plugin.cta.download-file": "Download File",
  "strapi-import-export.plugin.cta.get-data": "Fetch Data",
  "strapi-import-export.plugin.cta.export": "Export",
  "strapi-import-export.plugin.cta.import": "Import",
  "strapi-import-export.plugin.data-format.csv": "CSV [deprecated]",
  "strapi-import-export.plugin.data-format.json": "JSON [deprecated]",
  "strapi-import-export.plugin.data-format.json-v2": "JSON (v2)",
  "strapi-import-export.plugin.data-format.json-v3": "JSON (v3)",
  "strapi-import-export.plugin.form.field.id-field.hint": "Choose the field used as a unique identifier",
  "strapi-import-export.plugin.form.field.id-field.label": "Id Field",
  "strapi-import-export.plugin.form.field.id-field.placeholder": "Select identifier field",
  "strapi-import-export.plugin.form.field.existing-action.label": "Existing Entry Action",
  "strapi-import-export.plugin.form.field.existing-action.hint": "Choose how to handle existing entries",
  "strapi-import-export.plugin.form.field.existing-action.placeholder": "Select action",
  "strapi-import-export.plugin.form.field.ignore-missing-relations.label": "Ignore Missing Relations",
  "strapi-import-export.plugin.form.field.ignore-missing-relations.hint": "Continue import even if related entries are not found",
  "strapi-import-export.plugin.form.field.allow-locale-updates.label": "Allow New Locales on Skip",
  "strapi-import-export.plugin.form.field.allow-locale-updates.hint": "When skipping existing entries, still allow creation of new locales",
  "strapi-import-export.plugin.form.field.disallow-new-relations.label": "Prevent Relation Changes on Existing",
  "strapi-import-export.plugin.form.field.disallow-new-relations.hint": "When skipping existing entries, prevent any changes to their relations",
  "strapi-import-export.plugin.message.export.error.idfield.title": "Invalid ID Field Configuration",
  "strapi-import-export.plugin.message.export.error.idfield.message": "The ID field must be configured as required and unique",
  "strapi-import-export.plugin.message.import.errors": "There were errors during the import",
  "strapi-import-export.plugin.page.homepage.section.quick-actions.title": "Global Actions",
  "strapi-import-export.plugin.page.homepage.section.preferences.title": "Preferences",
  "strapi-import-export.plugin.page.homepage.section.need-help.title": "Feature Request / Bug Report",
  "strapi-import-export.plugin.page.homepage.section.need-help.description": "Feel free to reach out on the product roadmap, discord or github ✌️",
  "strapi-import-export.plugin.page.homepage.section.need-help.discord": "Discord",
  "strapi-import-export.plugin.page.homepage.section.need-help.github": "GitHub",
  "strapi-import-export.plugin.page.homepage.section.need-help.product-roadmap": "Product Roadmap",
  "strapi-import-export.plugin.message.export.error.forbidden.title": "Forbidden",
  "strapi-import-export.plugin.message.export.error.forbidden.message": "You don't have permission to read this data type.",
  "strapi-import-export.plugin.message.export.error.unexpected.title": "Export failed",
  "strapi-import-export.plugin.message.export.error.unexpected.message": "An unexpected error occured while exporting your data.",
  "strapi-import-export.plugin.message.import.error.forbidden.title": "Forbidden",
  "strapi-import-export.plugin.message.import.error.forbidden.message": "You don't have permission to write this data type.",
  "strapi-import-export.plugin.message.import.error.payload-too-large.title": "Payload Too Large",
  "strapi-import-export.plugin.message.import.error.payload-too-large.message": "The data size exceeds the file size limit of the server. Checkout the documentation to increase the file size limit.",
  "strapi-import-export.plugin.message.import.error.unexpected.title": "Import failed",
  "strapi-import-export.plugin.message.import.error.unexpected.message": "An unexpected error occured while importing your data.",
  "strapi-import-export.plugin.message.import.success.imported-successfully": "Your data has been imported successfully.",
  "strapi-import-export.plugin.message.import.success.imported.title": "Import successful",
  "strapi-import-export.plugin.message.import.success.imported.message": "Your data has been imported successfully.",
  "strapi-import-export.plugin.message.import.error.imported-partial.title": "Import partially failed",
  "strapi-import-export.plugin.message.import.error.imported-partial.message": "Some data failed to be imported. See below for detailed information.",
  "strapi-import-export.plugin.import.data-source-step.title": "Select a Data Source",
  "strapi-import-export.plugin.import.drag-drop-file": "Drag & drop your file into this area or browse for a file to upload",
  "strapi-import-export.plugin.import.file-name": "File name",
  "strapi-import-export.plugin.import.importing-data": "Importing data...",
  "strapi-import-export.plugin.import.partially-failed": "Import Partially Failed",
  "strapi-import-export.plugin.import.detailed-information": "Detailed Information:",
  "strapi-import-export.plugin.import.use-code-editor": "Use code editor",
  "strapi-import-export.plugin.import.tab.file": "File",
  "strapi-import-export.plugin.import.tab.options": "Options",
  "strapi-import-export.plugin.export.copied": "Copied",
  "strapi-import-export.plugin.export.fetching-data": "Fetching data...",
  "strapi-import-export.plugin.export.export-format": "Export Format",
  "strapi-import-export.plugin.export.export-format.hint": "Choose the format for your exported data",
  "strapi-import-export.plugin.export.options": "Options",
  "strapi-import-export.plugin.export.plugins-content-types": "Export plugins content types",
  "strapi-import-export.plugin.export.plugins-content-types.hint": "Include content types from plugins in the export",
  "strapi-import-export.plugin.export.relations-as-id": "Export relations as id.",
  "strapi-import-export.plugin.export.relations-as-id.hint": "Export only IDs for related content instead of full objects",
  "strapi-import-export.plugin.export.apply-filters-and-sort": "Apply filters and sort to exported data.",
  "strapi-import-export.plugin.export.apply-filters-and-sort.hint": "Use current view's filters and sorting in the export",
  "strapi-import-export.plugin.export.deepness": "Deepness",
  "strapi-import-export.plugin.export.deepness.hint": "Set how deep to traverse relations",
  "strapi-import-export.plugin.export.max-depth": "Max Depth",
  "strapi-import-export.plugin.export.max-depth.hint": "Set maximum depth for traversing relations",
  "strapi-import-export.plugin.export.export-all-locales": "Export all locales",
  "strapi-import-export.plugin.export.export-all-locales.hint": "Include all localized versions of content",
  "strapi-import-export.plugin.export.export-relations": "Export relations",
  "strapi-import-export.plugin.export.export-relations.hint": "Include related content in the export",
  "strapi-import-export.plugin.export.deep-populate-relations": "Deep populate relations",
  "strapi-import-export.plugin.export.deep-populate-relations.hint": "Include relations of related content",
  "strapi-import-export.plugin.export.deep-populate-component-relations": "Deep populate component relations",
  "strapi-import-export.plugin.export.deep-populate-component-relations.hint": "Include relations within components",
  "strapi-import-export.plugin.export.whole-database": "Whole database",
  "strapi-import-export.plugin.import.errors": "Import Errors"
};
const uk = {
  "strapi-import-export.plugin.name": "Import Export",
  "strapi-import-export.plugin.description": "Імпорт/експорт даних лише кількома кліками",
  "strapi-import-export.plugin.cta.back-to-data-sources": "Назад до джерел даних",
  "strapi-import-export.plugin.cta.back-to-options": "Назад до параметрів",
  "strapi-import-export.plugin.cta.cancel": "Скасувати",
  "strapi-import-export.plugin.cta.close": "Закрити",
  "strapi-import-export.plugin.cta.copy-to-clipboard": "Копіювати в буфер обміну",
  "strapi-import-export.plugin.cta.download-file": "Завантажити файл",
  "strapi-import-export.plugin.cta.get-data": "Отримати дані",
  "strapi-import-export.plugin.cta.export": "Експорт",
  "strapi-import-export.plugin.cta.import": "Імпорт",
  "strapi-import-export.plugin.data-format.csv": "CSV [не підтримується]",
  "strapi-import-export.plugin.data-format.json": "JSON [застаріле]",
  "strapi-import-export.plugin.data-format.json-v2": "JSON (версія 2)",
  "strapi-import-export.plugin.form.field.id-field.hint": "Виберіть поле, яке використовується як унікальний ідентифікатор",
  "strapi-import-export.plugin.form.field.id-field.label": "Поле ідентифікатора",
  "strapi-import-export.plugin.page.homepage.section.quick-actions.title": "Швидкі дії",
  "strapi-import-export.plugin.page.homepage.section.preferences.title": "Уподобання",
  "strapi-import-export.plugin.page.homepage.section.need-help.title": "Запит функції/звіт про помилку",
  "strapi-import-export.plugin.page.homepage.section.need-help.description": "Не соромтеся переглянути нашу дорожньою карту продукту, або зв'язати з нами за допомогою Discord або github ✌️",
  "strapi-import-export.plugin.page.homepage.section.need-help.discord": "Discord",
  "strapi-import-export.plugin.page.homepage.section.need-help.github": "GitHub",
  "strapi-import-export.plugin.page.homepage.section.need-help.product-roadmap": "Дорожня карта продукту",
  "strapi-import-export.plugin.message.export.error.forbidden.title": "Заборонено",
  "strapi-import-export.plugin.message.export.error.forbidden.message": "Ви не маєте дозволу читати цей тип даних.",
  "strapi-import-export.plugin.message.export.error.unexpected.title": "Помилка експорту",
  "strapi-import-export.plugin.message.export.error.unexpected.message": "Під час експорту ваших даних сталася неочікувана помилка.",
  "strapi-import-export.plugin.message.import.error.forbidden.title": "Заборонено",
  "strapi-import-export.plugin.message.import.error.forbidden.message": "Ви не маєте дозволу на запис цього типу даних.",
  "strapi-import-export.plugin.message.import.error.payload-too-large.title": "Корисне навантаження занадто велике",
  "strapi-import-export.plugin.message.import.error.payload-too-large.message": "Розмір даних перевищує обмеження розміру файлу на сервері. ",
  "strapi-import-export.plugin.message.import.error.unexpected.title": "Помилка імпорту",
  "strapi-import-export.plugin.message.import.error.unexpected.message": "Під час імпорту ваших даних сталася неочікувана помилка.",
  "strapi-import-export.plugin.message.import.success.imported-successfully": "Ваші дані успішно імпортовано.",
  "strapi-import-export.plugin.message.import.success.imported.title": "Імпорт успішний",
  "strapi-import-export.plugin.message.import.success.imported.message": "Ваші дані успішно імпортовано.",
  "strapi-import-export.plugin.message.import.error.imported-partial.title": "Частково не вдалося імпортувати",
  "strapi-import-export.plugin.message.import.error.imported-partial.message": "Деякі дані не вдалося імпортувати. ",
  "strapi-import-export.plugin.import.data-source-step.title": "Виберіть джерело даних",
  "strapi-import-export.plugin.import.drag-drop-file": "Перетягнути",
  "strapi-import-export.plugin.import.file-name": "Ім'я файлу",
  "strapi-import-export.plugin.import.importing-data": "Імпорт даних...",
  "strapi-import-export.plugin.import.partially-failed": "Частково не вдалося імпортувати",
  "strapi-import-export.plugin.import.detailed-information": "Детальна інформація:",
  "strapi-import-export.plugin.import.use-code-editor": "Використовуйте редактор коду",
  "strapi-import-export.plugin.import.tab.file": "Файл",
  "strapi-import-export.plugin.import.tab.options": "Опції",
  "strapi-import-export.plugin.export.copied": "Скопійовано",
  "strapi-import-export.plugin.export.fetching-data": "Отримання даних...",
  "strapi-import-export.plugin.export.export-format": "Формат експорту",
  "strapi-import-export.plugin.export.options": "Опції",
  "strapi-import-export.plugin.export.plugins-content-types": "Експортувати типи вмісту плагінів",
  "strapi-import-export.plugin.export.relations-as-id": "Експорт відносин як id.",
  "strapi-import-export.plugin.export.apply-filters-and-sort": "Застосуйте фільтри та сортуйте експортовані дані.",
  "strapi-import-export.plugin.export.deepness": "Глибина",
  "strapi-import-export.plugin.export.whole-database": "Вся база даних"
};
const translations = {
  en,
  uk
};
const useDownloadFile = () => {
  const downloadFile = (content, filename, contentType) => {
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.click();
  };
  const withTimestamp = (fileName) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/\D/g, "").substring(2);
    const name = fileName.split(".").slice(0, -1).join(".").concat(`_${ts}`);
    const extension = fileName.split(".").slice(-1);
    return [name, extension].join(".");
  };
  return {
    downloadFile,
    withTimestamp
  };
};
const PREFERENCES_KEY = "preferences";
const DEFAULT_PREFERENCES = {
  applyFilters: false,
  deepness: 5
};
const useLocalStorage = () => {
  const getPreferences = () => {
    const preferences = localStorage.getItem(PREFERENCES_KEY);
    return preferences != null ? { ...DEFAULT_PREFERENCES, ...JSON.parse(preferences) } : { ...DEFAULT_PREFERENCES };
  };
  const updatePreferences = (partialPreferences) => {
    const preferences = getPreferences();
    return localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...preferences, ...partialPreferences }));
  };
  const getItem = (key) => {
    return localStorage.getItem(key);
  };
  const setItem = (key, value) => {
    return localStorage.setItem(key, value);
  };
  return {
    getPreferences,
    updatePreferences,
    getItem,
    setItem
  };
};
const DEFAULT_OPTIONS = {
  exportFormat: dataFormats.JSON_V3,
  applyFilters: false,
  relationsAsId: false,
  deepness: 5,
  exportPluginsContentTypes: false,
  exportAllLocales: false,
  exportRelations: false,
  deepPopulateRelations: false,
  deepPopulateComponentRelations: false
};
const isFetchError = (err) => {
  return typeof err === "object" && err !== null && "name" in err && err.name === "FetchError";
};
const useExportModal = ({
  availableExportFormats = [dataFormats.CSV, dataFormats.JSON_V2, dataFormats.JSON_V3, dataFormats.JSON],
  unavailableOptions = [],
  documentIds = null
}) => {
  const { i18n } = useI18n();
  const { search } = reactRouterDom.useLocation();
  const { downloadFile, withTimestamp } = useDownloadFile();
  const { slug, isSlugWholeDb } = useSlug();
  const { notify } = useAlerts();
  const { getPreferences } = useLocalStorage();
  const { post } = strapiAdmin.useFetchClient();
  const [options, setOptions] = React.useState(() => ({ ...DEFAULT_OPTIONS, ...getPreferences() }));
  const [data, setData] = React.useState(null);
  const [fetchingData, setFetchingData] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const handleSetOption = (optionName, value) => {
    setOptions((prev) => ({ ...prev, [optionName]: value }));
  };
  const shouldShowOption = (optionName) => {
    if (unavailableOptions.indexOf(optionName) !== -1) {
      return false;
    }
    if (optionName === "relationsAsId" && options.exportFormat === dataFormats.JSON_V3) {
      return false;
    }
    return true;
  };
  const getData = async () => {
    setFetchingData(true);
    try {
      console.log("fetching data");
      const res = await post(`/${PLUGIN_ID}/export/contentTypes`, {
        data: {
          slug,
          search: qs__default.default.stringify(pick__default.default(qs__default.default.parse(search), ["filters", "sort"])),
          applySearch: options.applyFilters,
          exportFormat: options.exportFormat,
          relationsAsId: options.relationsAsId,
          deepness: options.deepness,
          exportPluginsContentTypes: options.exportPluginsContentTypes,
          documentIds: documentIds ?? void 0,
          exportAllLocales: options.exportAllLocales,
          exportRelations: options.exportRelations,
          deepPopulateRelations: options.deepPopulateRelations,
          deepPopulateComponentRelations: options.deepPopulateComponentRelations
        }
      });
      setData(res.data);
    } catch (err) {
      if (isFetchError(err)) {
        handleRequestErr(err, {
          403: () => notify(
            i18n("plugin.message.export.error.forbidden.title"),
            i18n("plugin.message.export.error.forbidden.message"),
            "danger"
          ),
          412: () => notify(
            i18n("plugin.message.export.error.idfield.title"),
            err.message,
            "danger"
          ),
          default: () => notify(
            i18n("plugin.message.export.error.unexpected.title"),
            i18n("plugin.message.export.error.unexpected.message"),
            "danger"
          )
        });
      } else {
        notify(
          i18n("plugin.message.export.error.unexpected.title"),
          i18n("plugin.message.export.error.unexpected.message"),
          "danger"
        );
      }
    } finally {
      setFetchingData(false);
    }
  };
  const writeDataToFile = async () => {
    const config = dataFormatConfigs[options.exportFormat];
    if (!config) {
      throw new Error(`File extension ${options.exportFormat} not supported to export data.`);
    }
    let dataToCopy;
    if (typeof data === "object") {
      dataToCopy = data?.data;
    } else {
      dataToCopy = data;
    }
    const { fileExt, fileContentType } = config;
    const fileName = `export_${slug}.${fileExt}`.replaceAll(":", "-").replaceAll("--", "-");
    downloadFile(dataToCopy, withTimestamp(fileName), `${fileContentType};charset=utf-8;`);
  };
  const copyToClipboard = () => {
    let dataToCopy;
    if (typeof data === "object") {
      dataToCopy = data?.data;
    } else {
      dataToCopy = data;
    }
    navigator.clipboard.writeText(dataToCopy);
    notify(i18n("plugin.export.copied"), "", "success");
  };
  const clearData = () => {
    setData(null);
  };
  const resetOptions = () => {
    const storedPreferences = getPreferences();
    setOptions({ ...DEFAULT_OPTIONS, ...storedPreferences });
    setData(null);
    setFetchingData(false);
  };
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (open) {
      resetOptions();
    }
  };
  const shouldShowDeepnessOption = () => {
    return shouldShowOption("deepness") && (options.exportFormat === dataFormats.JSON_V2 || options.exportFormat === dataFormats.JSON_V3 && options.exportRelations);
  };
  return {
    options,
    setOptions,
    data,
    setData,
    fetchingData,
    setFetchingData,
    isOpen,
    setIsOpen,
    handleSetOption,
    shouldShowOption,
    getData,
    writeDataToFile,
    copyToClipboard,
    clearData,
    resetOptions,
    handleOpenChange,
    shouldShowDeepnessOption,
    availableExportFormats,
    unavailableOptions,
    slug,
    isSlugWholeDb
  };
};
const ExportModalContent = ({ state }) => {
  const { i18n } = useI18n();
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    state.fetchingData && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "center", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, { children: i18n("plugin.export.fetching-data") }) }),
    !state.data && !state.fetchingData && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      state.shouldShowOption("exportFormat") && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Root, { gap: 2, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { xs: 12, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.export-format.hint"), children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", tag: "h2", children: i18n("plugin.export.export-format") }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {}),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.SingleSelect,
          {
            id: "export-format",
            required: true,
            placeholder: i18n("plugin.export.export-format"),
            value: state.options.exportFormat,
            onChange: (value) => state.handleSetOption("exportFormat", value),
            children: state.availableExportFormats.map((format) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: format, children: i18n(`plugin.data-format.${format}`) }, format))
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: "16px", marginTop: 6, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", tag: "h2", children: i18n("plugin.export.options") }),
        state.shouldShowOption("relationsAsId") && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.relations-as-id.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: state.options.relationsAsId,
              onCheckedChange: (value) => state.handleSetOption("relationsAsId", value == true),
              children: i18n("plugin.export.relations-as-id")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }),
        state.shouldShowOption("applyFilters") && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.apply-filters-and-sort.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: state.options.applyFilters,
              onCheckedChange: (value) => state.handleSetOption("applyFilters", value == true),
              children: i18n("plugin.export.apply-filters-and-sort")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }),
        state.shouldShowOption("exportPluginsContentTypes") && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.plugins-content-types.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: state.options.exportPluginsContentTypes,
              onCheckedChange: (value) => state.handleSetOption("exportPluginsContentTypes", value == true),
              children: i18n("plugin.export.plugins-content-types")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }),
        state.shouldShowOption("exportAllLocales") && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.export-all-locales.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: state.options.exportAllLocales,
              onCheckedChange: (value) => state.handleSetOption("exportAllLocales", value == true),
              children: i18n("plugin.export.export-all-locales")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }),
        state.shouldShowOption("exportRelations") && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.export-relations.hint"), children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: state.options.exportRelations,
              onCheckedChange: (value) => state.handleSetOption("exportRelations", value == true),
              children: i18n("plugin.export.export-relations")
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
        ] }),
        state.shouldShowOption("exportRelations") && state.options.exportRelations && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.deep-populate-relations.hint"), children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Checkbox,
              {
                checked: state.options.deepPopulateRelations,
                onCheckedChange: (value) => state.handleSetOption("deepPopulateRelations", value == true),
                children: i18n("plugin.export.deep-populate-relations")
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n("plugin.export.deep-populate-component-relations.hint"), children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Checkbox,
              {
                checked: state.options.deepPopulateComponentRelations,
                onCheckedChange: (value) => state.handleSetOption("deepPopulateComponentRelations", value == true),
                children: i18n("plugin.export.deep-populate-component-relations")
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {})
          ] })
        ] }),
        state.shouldShowDeepnessOption() && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { hint: i18n(
          state.options.exportFormat === dataFormats.JSON_V3 ? "plugin.export.max-depth.hint" : "plugin.export.deepness.hint"
        ), children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", tag: "h2", children: i18n(
            state.options.exportFormat === dataFormats.JSON_V3 ? "plugin.export.max-depth" : "plugin.export.deepness"
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, {}),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.SingleSelect,
            {
              placeholder: i18n(
                state.options.exportFormat === dataFormats.JSON_V3 ? "plugin.export.max-depth" : "plugin.export.deepness"
              ),
              value: state.options.deepness,
              onChange: (value) => state.handleSetOption("deepness", parseInt(value, 10)),
              children: range__default.default(1, 21).map((deepness) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: deepness, children: deepness }, deepness))
            }
          )
        ] })
      ] })
    ] }),
    state.data && !state.fetchingData && /* @__PURE__ */ jsxRuntime.jsx(Editor, { content: state.data, language: dataFormatConfigs[state.options.exportFormat].language })
  ] });
};
const ExportModalFooter = ({ state }) => {
  const { i18n } = useI18n();
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    !!state.data && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { variant: "tertiary", onClick: state.clearData, children: i18n("plugin.cta.back-to-options") }),
    !state.data && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: state.getData, children: i18n("plugin.cta.get-data") }),
    !!state.data && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { variant: "secondary", onClick: state.copyToClipboard, children: i18n("plugin.cta.copy-to-clipboard") }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: state.writeDataToFile, children: i18n("plugin.cta.download-file") })
    ] })
  ] });
};
const InjectedExportCollectionType = () => {
  const state = useExportModal({ unavailableOptions: ["exportPluginsContentTypes"] });
  const { i18n } = useI18n();
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Root, { onOpenChange: state.handleOpenChange, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Trigger, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Download, {}), children: i18n("plugin.cta.export", "Export") }) }),
    state.isOpen && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", tag: "h2", id: "title", children: i18n("plugin.cta.export", "Export") }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral800", tag: "h2", id: "title", children: state.isSlugWholeDb ? i18n("plugin.export.whole-database", "Whole database") : state.slug })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsx(ExportModalContent, { state }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsx(ExportModalFooter, { state }) })
    ] })
  ] });
};
const InjectedImportExportSingleType = () => {
  const { formatMessage } = reactIntl.useIntl();
  return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Protect, { permissions: pluginPermissions.main, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { background: "neutral0", hasRadius: true, shadow: "filterShadow", paddingTop: 6, paddingBottom: 4, paddingLeft: 3, paddingRight: 3, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", textColor: "neutral600", children: formatMessage({ id: getTrad("plugin.name") }) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, paddingBottom: 6, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Divider, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 1, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 2, children: [
      /* @__PURE__ */ jsxRuntime.jsx(InjectedExportCollectionType, {}),
      /* @__PURE__ */ jsxRuntime.jsx(ImportModal, {})
    ] }) })
  ] }) }) });
};
const ExportAction = ({ documents, model, collectionType }) => {
  const { i18n } = useI18n();
  const [{ query }] = strapiAdmin.useQueryParams();
  React__default.default.useMemo(() => strapiAdmin$1.buildValidParams(query), [query]);
  const documentIds = documents.map(({ documentId }) => documentId);
  const state = useExportModal({ unavailableOptions: ["exportPluginsContentTypes"], documentIds });
  return {
    variant: "default",
    label: i18n("plugin.cta.export", "Export"),
    icon: /* @__PURE__ */ jsxRuntime.jsx(icons.Download, {}),
    onClick: () => {
      state.resetOptions();
      console.log("onClick");
      console.log("collectionType", collectionType);
      console.log("model", model);
      console.log("documents", documents);
      console.log("documentIds", documentIds);
    },
    dialog: {
      type: "modal",
      title: i18n("plugin.cta.export", "Export"),
      content: /* @__PURE__ */ jsxRuntime.jsx(ExportModalContent, { state }),
      footer: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsx(ExportModalFooter, { state }) })
    }
  };
};
const BULK_ACTIONS = [ExportAction];
const index = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Import Export"
      },
      permissions: pluginPermissions.main,
      Component: async () => {
        const { App } = await Promise.resolve().then(() => require("./App-B2U91YYr.js"));
        return App;
      }
    });
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID
    });
  },
  bootstrap(app) {
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: `${PLUGIN_ID}-alerts`,
      Component: Alerts
    });
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: `${PLUGIN_ID}-import`,
      Component: ImportModal
    });
    const ExportModal = InjectedExportCollectionType;
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: `${PLUGIN_ID}-export`,
      Component: ExportModal
    });
    app.getPlugin("content-manager").injectComponent("editView", "right-links", {
      name: `${PLUGIN_ID}-alerts`,
      Component: Alerts
    });
    app.getPlugin("content-manager").injectComponent("editView", "right-links", {
      name: `${PLUGIN_ID}-import-export`,
      Component: InjectedImportExportSingleType
    });
    app.getPlugin("content-manager").apis.addBulkAction(BULK_ACTIONS);
  },
  async registerTrads(app) {
    const { locales } = app;
    const importedTranslations = [
      {
        data: translations.en,
        locale: "en"
      },
      {
        data: translations.uk,
        locale: "uk"
      }
    ];
    return importedTranslations;
  }
  // async registerTrads(app: any) {
  //   const { locales } = app;
  //   const importedTranslations = await Promise.all(
  //     (locales as string[]).map((locale) => {
  //       return import(`./translations/${locale}.json`)
  //         .then(({ default: data }) => {
  //           return {
  //             data: getTranslation(data),
  //             locale,
  //           };
  //         })
  //         .catch(() => {
  //           return {
  //             data: {},
  //             locale,
  //           };
  //         });
  //     })
  //   );
  //   return importedTranslations;
  // },
};
exports.ExportModalContent = ExportModalContent;
exports.ExportModalFooter = ExportModalFooter;
exports.ImportModal = ImportModal;
exports.index = index;
exports.pluginPermissions = pluginPermissions;
exports.useExportModal = useExportModal;
exports.useI18n = useI18n;
exports.useLocalStorage = useLocalStorage;
