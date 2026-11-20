import { expect, test, vi } from "vitest";

import { createUpdateController } from "./update-controller";

const setup = () => {
  const port = {
    check: vi.fn(() => Promise.resolve({ id: "update-b", rollback: false })),
    download: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
    isBusy: vi.fn(() => false),
    running: vi.fn(() => ({ id: "update-a", embedded: false })),
  };
  return { port, controller: createUpdateController(port) };
};

test("foreground checks and downloads are deduplicated while in flight", async () => {
  const { port, controller } = setup();
  await Promise.all([
    controller.check(),
    controller.check(),
    controller.check(),
  ]);
  expect(port.check).toHaveBeenCalledTimes(1);
  expect(port.download).toHaveBeenCalledTimes(1);
});

test("doesn't download the running update even if native checking reports it available", async () => {
  const { port, controller } = setup();
  port.running.mockReturnValue({ id: "UPDATE-B", embedded: false });
  await controller.check();
  expect(port.download).not.toHaveBeenCalled();
});

test("rapid restart taps cause only one reload", async () => {
  const { port, controller } = setup();
  await Promise.all([controller.restart(), controller.restart()]);
  expect(port.reload).toHaveBeenCalledTimes(1);
});

test("a rejected reload can be retried instead of permanently suppressing the prompt", async () => {
  const { port, controller } = setup();
  port.reload.mockRejectedValueOnce(new Error("reload failed"));
  await expect(controller.restart()).rejects.toThrow("reload failed");
  await controller.restart();
  expect(port.reload).toHaveBeenCalledTimes(2);
});

test("failed downloads can retry on the next foreground event", async () => {
  const { port, controller } = setup();
  port.download.mockRejectedValueOnce(new Error("offline"));
  await expect(controller.check()).rejects.toThrow("offline");
  await controller.check();
  expect(port.download).toHaveBeenCalledTimes(2);
});

test("doesn't compete with native startup or check during reload", async () => {
  const { port, controller } = setup();
  port.isBusy.mockReturnValue(true);
  await controller.check();
  expect(port.check).not.toHaveBeenCalled();
  port.isBusy.mockReturnValue(false);
  const restart = controller.restart();
  await controller.check();
  await restart;
  expect(port.check).not.toHaveBeenCalled();
});
