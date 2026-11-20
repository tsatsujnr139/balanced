import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { useRemoteUpdate } from "./updates";

const mocks = vi.hoisted(() => ({
  runningId: "update-a",
  embedded: false,
  state: {
    isStartupProcedureRunning: false,
    isUpdatePending: false,
    isChecking: false,
    isDownloading: false,
    isRestarting: false,
    downloadedUpdate: undefined as
      | undefined
      | { type: string; updateId?: string; createdAt: Date },
  },
  check: vi.fn(),
  download: vi.fn(),
  reload: vi.fn(),
  remove: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock("expo-updates", () => ({
  isEnabled: true,
  get updateId() {
    return mocks.runningId;
  },
  get isEmbeddedLaunch() {
    return mocks.embedded;
  },
  get latestContext() {
    return mocks.state;
  },
  useUpdates: () => ({
    ...mocks.state,
    currentlyRunning: {
      updateId: mocks.runningId,
      isEmbeddedLaunch: mocks.embedded,
    },
  }),
  checkForUpdateAsync: mocks.check,
  fetchUpdateAsync: mocks.download,
  reloadAsync: mocks.reload,
}));
vi.mock("react-native", () => ({
  AppState: { addEventListener: mocks.subscribe },
}));
vi.mock("./update-screen", () => ({
  getReloadScreenOptions: () => ({ backgroundColor: "#fff" }),
}));

let latest: ReturnType<typeof useRemoteUpdate>;
let renderer: ReactTestRenderer | undefined;
function Probe() {
  latest = useRemoteUpdate();
  return null;
}
const render = async () => {
  await act(async () => {
    if (renderer) {
      renderer.update(createElement(Probe));
    } else {
      renderer = create(createElement(Probe));
    }
    await Promise.resolve();
  });
};
const pending = (id: string) => {
  mocks.state.isUpdatePending = true;
  mocks.state.downloadedUpdate = {
    type: "new",
    updateId: id,
    createdAt: new Date(0),
  };
};

beforeEach(() => {
  vi.stubGlobal("__DEV__", false);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mocks.runningId = "update-a";
  mocks.embedded = false;
  Object.assign(mocks.state, {
    isStartupProcedureRunning: false,
    isUpdatePending: false,
    isChecking: false,
    isDownloading: false,
    isRestarting: false,
    downloadedUpdate: undefined,
  });
  mocks.check.mockResolvedValue({
    isAvailable: false,
    isRollBackToEmbedded: false,
  });
  mocks.download.mockResolvedValue({ isNew: true });
  mocks.reload.mockResolvedValue(null);
  mocks.subscribe.mockReturnValue({ remove: mocks.remove });
});
afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
    await Promise.resolve();
  });
  renderer = undefined;
  vi.unstubAllGlobals();
});

test("one restart removes the prompt after JS reload even when the native pending flag survives", async () => {
  pending("update-b");
  await render();
  expect(latest.canRestart).toBe(true);
  await latest.reloadApp();
  expect(mocks.reload).toHaveBeenCalledTimes(1);
  await act(async () => {
    renderer?.unmount();
    await Promise.resolve();
  });
  renderer = undefined;
  mocks.runningId = "update-b";
  await render();
  expect(mocks.state.isUpdatePending).toBe(true);
  expect(latest.canRestart).toBe(false);
  // A later release must still display its prompt in this same app session.
  pending("update-c");
  await render();
  expect(latest.canRestart).toBe(true);
});

test("native progress rerenders don't repeatedly check or replace the foreground listener", async () => {
  await render();
  const reload = latest.reloadApp;
  mocks.state.isChecking = true;
  await render();
  mocks.state.isChecking = false;
  pending("update-b");
  await render();
  await render();
  expect(mocks.check).toHaveBeenCalledTimes(1);
  expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  expect(latest.reloadApp).toBe(reload);
});

test("waits for native startup before checking and downloads once on foreground", async () => {
  mocks.state.isStartupProcedureRunning = true;
  await render();
  expect(mocks.check).not.toHaveBeenCalled();
  mocks.state.isStartupProcedureRunning = false;
  mocks.check.mockResolvedValue({
    isAvailable: true,
    isRollBackToEmbedded: false,
    manifest: { id: "update-b" },
  });
  await render();
  expect(mocks.download).toHaveBeenCalledTimes(1);
  const onStateChange = mocks.subscribe.mock.calls[0]?.[1];
  mocks.check.mockResolvedValue({
    isAvailable: false,
    isRollBackToEmbedded: false,
  });
  await act(async () => {
    onStateChange("active");
    await Promise.resolve();
  });
  expect(mocks.check).toHaveBeenCalledTimes(2);
  expect(mocks.download).toHaveBeenCalledTimes(1);
});

test("rollback is offered once, then hidden when the embedded bundle is running", async () => {
  mocks.state.isUpdatePending = true;
  mocks.state.downloadedUpdate = { type: "rollback", createdAt: new Date(0) };
  await render();
  expect(latest.canRestart).toBe(true);
  mocks.embedded = true;
  await render();
  expect(latest.canRestart).toBe(false);
});
