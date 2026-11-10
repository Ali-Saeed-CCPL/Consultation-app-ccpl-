/* The doctor's availability lives in consult-api. This keeps the portal and the
   server in step: the switch goes through the API, and while the portal is open
   it pings every 10 s (silent for 30 s = counted gone). If the server ends the
   session (deactivated, password reset elsewhere) the doctor is signed out. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { PING_EVERY_MS, staffApi } from "@/api/staff";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";
import type { Doctor } from "@/lib/types";

/** Signs out and goes to the login page when the server says this session is over; otherwise shows the error. */
export function useApiErrorHandler() {
  const navigate = useNavigate();
  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.endsSession) {
        useSession.getState().signOut();
        toast.error(error.message);
        navigate({ to: "/login", replace: true });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    },
    [navigate],
  );
}

/** Pings while mounted, and copies the server's view of availability into the roster. */
export function useDoctorHeartbeat(doctor: Doctor) {
  const onError = useApiErrorHandler();
  const failing = useRef(false);

  useEffect(() => {
    let stopped = false;
    const beat = async () => {
      try {
        const presence = await staffApi.ping();
        failing.current = false;
        if (stopped) return;
        const current = usePlatform.getState().doctors.find((d) => d.id === doctor.id);
        // e.g. switched off by the server after two missed rings.
        if (current && current.available !== presence.is_available) usePlatform.getState().setAvailability(doctor.id, presence.is_available);
      } catch (error) {
        if (stopped) return;
        if (error instanceof ApiError && error.endsSession) return onError(error);
        // A dropped network: say it once, keep trying.
        if (!failing.current) toast.error("Lost contact with the server. Retrying…");
        failing.current = true;
      }
    };
    void beat();
    const timer = window.setInterval(beat, PING_EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [doctor.id, onError]);
}

/** The Available / Unavailable switch. The roster changes only once the server has agreed. */
export function useAvailabilityToggle(doctor: Doctor) {
  const onError = useApiErrorHandler();
  const [saving, setSaving] = useState(false);
  const toggle = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const presence = await staffApi.setAvailability(!doctor.available);
      usePlatform.getState().setAvailability(doctor.id, presence.is_available);
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  }, [doctor.id, doctor.available, saving, onError]);
  return { toggle, saving };
}
