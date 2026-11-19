/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as automaticRules from "../automaticRules.js";
import type * as capture from "../capture.js";
import type * as finance from "../finance.js";
import type * as labels from "../labels.js";
import type * as lib_automaticRuleMatching from "../lib/automaticRuleMatching.js";
import type * as lib_capture_chat from "../lib/capture/chat.js";
import type * as lib_capture_labels from "../lib/capture/labels.js";
import type * as lib_capture_model from "../lib/capture/model.js";
import type * as lib_capture_parser from "../lib/capture/parser.js";
import type * as lib_capture_redact from "../lib/capture/redact.js";
import type * as lib_capture_transfers from "../lib/capture/transfers.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  automaticRules: typeof automaticRules;
  capture: typeof capture;
  finance: typeof finance;
  labels: typeof labels;
  "lib/automaticRuleMatching": typeof lib_automaticRuleMatching;
  "lib/capture/chat": typeof lib_capture_chat;
  "lib/capture/labels": typeof lib_capture_labels;
  "lib/capture/model": typeof lib_capture_model;
  "lib/capture/parser": typeof lib_capture_parser;
  "lib/capture/redact": typeof lib_capture_redact;
  "lib/capture/transfers": typeof lib_capture_transfers;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
