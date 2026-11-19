import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { usageFields } from "./lib/capture/usage";
import schema from "./schema";

export const recordAttempt = internalMutation({
  args: usageFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("llmUsage", args);
    return null;
  },
});

/** Inspect through the Convex dashboard; billing data isn't a public API. */
export const list = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("llmUsage")),
  handler: async (ctx, args) =>
    await ctx.db.query("llmUsage").order("desc").paginate(args.paginationOpts),
});
