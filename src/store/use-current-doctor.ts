import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

/** The doctor signed in on this tab, or undefined. */
export function useCurrentDoctor() {
  const doctorId = useSession((s) => s.doctorId);
  return usePlatform((s) => s.doctors.find((d) => d.id === doctorId));
}
