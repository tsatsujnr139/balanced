import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    /** API key for the cloud transaction-capture fallback (OpenCode pay-as-you-go). */
    LLM_API_KEY: v.optional(v.string()),
    /** OpenAI-compatible base URL; defaults to OpenCode pay-as-you-go. */
    LLM_BASE_URL: v.optional(v.string()),
    /** Model ID; defaults to glm-5.3-flash. */
    LLM_MODEL: v.optional(v.string()),
  },
});

export default app;
