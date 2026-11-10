/* The admin's doctor accounts, from consult-api. Each fetch is copied into the
   local roster (by backend id, else PMDC number), so the demo dashboards, charts
   and routing see the same doctors the server has. */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi, type AdminDoctor } from "@/api/staff";
import { useApiErrorHandler } from "@/features/portal/use-doctor-presence";
import { usePlatform } from "@/store/consult-store";

export const ADMIN_DOCTORS_KEY = ["admin", "doctors"] as const;

/** The server stops counting a switched-on doctor once their portal has been silent this long. */
const GONE_AFTER_MS = 30_000;

export const syncAdminDoctor = (d: AdminDoctor) =>
  usePlatform.getState().syncDoctor({
    userId: d.user_id,
    username: d.username,
    name: d.full_name,
    pmdc: d.pmdc_no,
    // Switched on AND still pinging: a doctor who closed the portal is not really available.
    available: d.is_available && d.last_seen_at !== null && Date.now() - Date.parse(d.last_seen_at) < GONE_AFTER_MS,
    active: d.is_active,
  });

/** Loads the doctors (refetched every 30 s, so availability stays current) and keeps the roster in step. */
export function useAdminDoctors() {
  const onError = useApiErrorHandler();
  const query = useQuery({ queryKey: ADMIN_DOCTORS_KEY, queryFn: staffApi.listDoctors, refetchInterval: 30_000 });

  useEffect(() => {
    query.data?.forEach(syncAdminDoctor);
  }, [query.data]);

  useEffect(() => {
    if (query.error) onError(query.error);
  }, [query.error, onError]);

  return query;
}

/** Create, edit, deactivate and reset: each refreshes the list afterwards. Errors are thrown to the form. */
export function useDoctorMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ADMIN_DOCTORS_KEY });
  const done = (d: AdminDoctor) => {
    const id = syncAdminDoctor(d);
    void refresh();
    return id;
  };

  const create = useMutation({ mutationFn: (input: Parameters<typeof staffApi.createDoctor>[0]) => staffApi.createDoctor(input).then(done) });
  const update = useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: Parameters<typeof staffApi.updateDoctor>[1] }) => staffApi.updateDoctor(userId, input).then(done),
  });
  const resetPassword = useMutation({ mutationFn: ({ userId, password }: { userId: string; password: string }) => staffApi.resetDoctorPassword(userId, password) });

  return { create, update, resetPassword };
}
