interface UpdateCandidate {
  id?: string;
  rollback: boolean;
}

interface UpdatePort {
  check: () => Promise<UpdateCandidate | null>;
  download: () => Promise<unknown>;
  reload: () => Promise<void>;
  isBusy: () => boolean;
  running: () => { id: string | null; embedded: boolean };
}

/** One owner for checking/downloading/restarting, including rapid foreground events. */
export const createUpdateController = (port: UpdatePort) => {
  let checking: Promise<void> | null = null;
  let restarting: Promise<void> | null = null;

  const check = (): Promise<void> => {
    if (checking) {
      return checking;
    }
    if (restarting || port.isBusy()) {
      return Promise.resolve();
    }
    const run = async () => {
      const candidate = await port.check();
      if (!candidate) {
        return;
      }
      const current = port.running();
      const needed = candidate.rollback
        ? !current.embedded
        : Boolean(
            candidate.id &&
            candidate.id.toLowerCase() !== current.id?.toLowerCase()
          );
      if (needed) {
        await port.download();
      }
    };
    checking = run().finally(() => {
      checking = null;
    });
    return checking;
  };

  const restart = (): Promise<void> => {
    if (restarting) {
      return restarting;
    }
    const run = async () => {
      try {
        await checking;
      } catch {
        // A failed background check doesn't invalidate an already downloaded update.
      }
      await port.reload();
    };
    restarting = run().finally(() => {
      restarting = null;
    });
    return restarting;
  };

  return { check, restart };
};
