"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const admin = require("@strapi/strapi/admin");
const reactRouterDom = require("react-router-dom");
const designSystem = require("@strapi/design-system");
const icons = require("@strapi/icons");
const React = require("react");
const index = require("./index-DNjNPXHb.js");
const reactIntl = require("react-intl");
const lodash = require("lodash");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const React__default = /* @__PURE__ */ _interopDefault(React);
const Header = () => {
  const { i18n } = index.useI18n();
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, margin: 2, background: "neutral100", children: /* @__PURE__ */ jsxRuntime.jsxs(
    designSystem.Flex,
    {
      direction: "column",
      gap: "medium",
      alignItems: "left",
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", as: "h1", children: i18n("plugin.name", "Import Export") }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", as: "h3", children: i18n(
          "plugin.description",
          "Import/Export data from and to your database in just few clicks"
        ) })
      ]
    }
  ) });
};
const Preferences = () => {
  const { formatMessage: i18n } = reactIntl.useIntl();
  const { getPreferences, updatePreferences } = index.useLocalStorage();
  const [preferences, setPreferences] = React.useState(() => getPreferences());
  const handleUpdatePreferences = React.useCallback((key, value) => {
    updatePreferences({ [key]: value });
    setPreferences(getPreferences());
  }, [updatePreferences, getPreferences]);
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { style: { alignSelf: "stretch" }, background: "neutral0", padding: 8, hasRadius: true, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 0, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: i18n({ id: "plugin.page.homepage.section.preferences.title", defaultMessage: "Default Preferences" }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", children: i18n({ id: "plugin.page.homepage.section.preferences.description", defaultMessage: "Configure the default export behavior, so you don't have to set it every time you export." }) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 4, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "space-between", children: /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Checkbox,
        {
          checked: preferences.applyFilters,
          onCheckedChange: (value) => handleUpdatePreferences("applyFilters", value),
          children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: i18n({ id: "plugin.export.apply-filters-and-sort", defaultMessage: "Apply filters and sort to exported data" }) })
        }
      ) }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", as: "h2", children: i18n({ id: "plugin.export.deepness", defaultMessage: "Deepness" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.SingleSelect,
          {
            label: i18n({ id: "plugin.export.deepness", defaultMessage: "Deepness" }),
            placeholder: i18n({ id: "plugin.export.deepness", defaultMessage: "Deepness" }),
            value: preferences.deepness,
            onChange: (value) => handleUpdatePreferences("deepness", value),
            children: lodash.range(1, 21).map((deepness) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: deepness.toString(), children: deepness }, deepness))
          }
        )
      ] })
    ] }) })
  ] }) });
};
const Preferences$1 = React__default.default.memo(Preferences);
const About = () => {
  const { formatMessage: i18n } = reactIntl.useIntl();
  return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { style: { alignSelf: "stretch" }, background: "neutral0", padding: 8, marginTop: 6, hasRadius: true, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 6, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", alignItems: "start", gap: 0, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: i18n({ id: "plugin.page.about.title", defaultMessage: "About" }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 4, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", children: "Strapi 5 Versions" }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", children: "V3 Format" }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: i18n({
          id: "plugin.page.about.strapi5.v3.description",
          defaultMessage: "Complete rewrite focusing on draft/published content and better relation handling."
        }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://github.com/Moonlight63/strapi-import-export", isExternal: true, children: "GitHub (V3 Fork)" }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", marginTop: 2, children: "Original Strapi 5 Port" }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "row", gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://github.com/Prototypr/strapi-import-export", isExternal: true, children: "GitHub (Strapi 5)" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://x.com/graeme_fulton", isExternal: true, children: "Converted by Graeme" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 2, marginTop: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", children: "Original Work" }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: i18n({
          id: "plugin.page.about.original-work.description",
          defaultMessage: "Originally created by Baptiste Studer, most of his work makes up this Strapi 5 version."
        }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://strapi-import-export-entries.canny.io", isExternal: true, children: i18n({
            id: "plugin.page.about.need-help.product-roadmap",
            defaultMessage: "Product Roadmap"
          }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://discord.gg/dcqCAFFdP8", isExternal: true, children: i18n({
            id: "plugin.page.about.need-help.discord",
            defaultMessage: "Discord"
          }) }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Link, { href: "https://github.com/Baboo7/strapi-plugin-import-export-entries/issues", isExternal: true, children: i18n({
            id: "plugin.page.about.need-help.github",
            defaultMessage: "GitHub (Strapi 4)"
          }) })
        ] })
      ] })
    ] }) })
  ] }) });
};
const About$1 = React__default.default.memo(About);
const HomePage = () => {
  const { formatMessage } = reactIntl.useIntl();
  const { i18n } = index.useI18n();
  const state = index.useExportModal({ unavailableOptions: ["exportPluginsContentTypes"] });
  return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Main, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 6, paddingTop: 3, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Header, {}),
    /* @__PURE__ */ jsxRuntime.jsxs(admin.Page.Protect, { permissions: index.pluginPermissions.main, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Box,
        {
          style: { alignSelf: "stretch" },
          background: "neutral0",
          padding: 8,
          margin: 6,
          hasRadius: true,
          children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 6, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "start", gap: 0, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: i18n("plugin.page.homepage.section.quick-actions.title", "Global Actions") }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "epsilon", children: i18n("plugin.page.homepage.section.quick-actions.description", "Import and export data from all your content types at once.") })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", alignItems: "start", gap: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, children: [
              /* @__PURE__ */ jsxRuntime.jsx(index.ImportModal, {}),
              /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Root, { onOpenChange: state.handleOpenChange, children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Trigger, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { startIcon: /* @__PURE__ */ jsxRuntime.jsx(icons.Download, {}), children: i18n("plugin.cta.export", "Export") }) }),
                state.isOpen && /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Header, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Title, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", textColor: "neutral800", tag: "h2", id: "title", children: i18n("plugin.cta.export", "Export") }),
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral800", tag: "h2", id: "title", children: state.isSlugWholeDb ? i18n("plugin.export.whole-database", "Whole database") : state.slug })
                  ] }) }) }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsx(index.ExportModalContent, { state }) }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsx(index.ExportModalFooter, { state }) })
                ] })
              ] })
            ] }) }) })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 6, paddingTop: 3, paddingBottom: 0, children: /* @__PURE__ */ jsxRuntime.jsx(Preferences$1, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 6, paddingTop: 3, paddingBottom: 0, children: /* @__PURE__ */ jsxRuntime.jsx(About$1, {}) })
    ] })
  ] }) }) });
};
const HomePage$1 = React.memo(HomePage);
const App = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(HomePage$1, {}) }),
    /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Error, {}) })
  ] });
};
exports.App = App;
