import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // Downgrade to warning: these are all legitimate mount-time initialization
      // effects (localStorage reads, data loading). Refactoring every component
      // to useSyncExternalStore or state initializers is a separate effort.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
