import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useState } from "react";

const PROFILE_FIRST_NAME_KEY = "profile.firstName.v1";

export function normalizeFirstName(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function useLocalProfile() {
  const [firstName, setFirstNameState] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let isActive = true;

    Storage.getItem(PROFILE_FIRST_NAME_KEY)
      .then((value) => {
        if (isActive) {
          setFirstNameState(value ?? "");
        }
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setFirstName = useCallback(async (value: string) => {
    const nextFirstName = normalizeFirstName(value);
    if (nextFirstName.length > 40) {
      throw new Error("Name must be 40 characters or fewer");
    }

    await Storage.setItem(PROFILE_FIRST_NAME_KEY, nextFirstName);
    setFirstNameState(nextFirstName);
    return nextFirstName;
  }, []);

  return useMemo(
    () => ({
      firstName,
      isLoadingProfile,
      setFirstName,
    }),
    [firstName, isLoadingProfile, setFirstName]
  );
}
