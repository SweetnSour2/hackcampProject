module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.cjs"],
  collectCoverageFrom: ["tools/**/*.cjs", "!tools/**/*.test.cjs"],
};
