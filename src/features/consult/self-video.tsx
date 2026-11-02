/* This device's camera, mirrored like a mirror (as Meet does for your own tile). */

import { useEffect, useRef } from "react";

export default function SelfVideo({ stream, className = "" }: { stream: MediaStream; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={`h-full w-full -scale-x-100 object-cover ${className}`} />;
}
