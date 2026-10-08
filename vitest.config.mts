export default {
  resolve: {
    alias: {
      "@": new URL("./apps/web/src/", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    pool: "threads",
  },
};
