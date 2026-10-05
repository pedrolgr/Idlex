import { useEffect, useState } from "react";
import { SlotData } from "../types/index.ts";

export function useSSE() {
  const [slots, setSlots] = useState<SlotData[]>([
    { id: 1, status: "idle", errorMessage: null, account: null, character: null, session: { huntActive: false, elapsedMs: 0, kills: 0 }, catalogCount: 0 },
    { id: 2, status: "idle", errorMessage: null, account: null, character: null, session: { huntActive: false, elapsedMs: 0, kills: 0 }, catalogCount: 0 },
    { id: 3, status: "idle", errorMessage: null, account: null, character: null, session: { huntActive: false, elapsedMs: 0, kills: 0 }, catalogCount: 0 },
    { id: 4, status: "idle", errorMessage: null, account: null, character: null, session: { huntActive: false, elapsedMs: 0, kills: 0 }, catalogCount: 0 },
  ]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => {
      setIsLive(true);
    };

    es.onmessage = (event) => {
      try {
        const data: SlotData[] = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setSlots(data);
        }
      } catch (err) {
        console.error("Erro ao decodificar evento SSE:", err);
      }
    };

    es.onerror = () => {
      setIsLive(false);
    };

    return () => {
      es.close();
    };
  }, []);

  return { slots, isLive };
}
