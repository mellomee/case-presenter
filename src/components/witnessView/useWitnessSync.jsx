import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ROOM_ID = 'case-presenter-witness';

export function useWitnessSync(role = 'attorney') {
  const [witnessState, setWitnessState] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const records = await base44.entities.WitnessState.filter({ room_id: ROOM_ID });
      if (cancelled) return;

      if (records.length > 0) {
        setRecordId(records[0].id);
        setWitnessState(records[0]);
      } else if (role === 'attorney') {
        const created = await base44.entities.WitnessState.create({
          room_id: ROOM_ID,
          is_blank: true,
          published_proof_id: null,
          pdf_page: 1,
          zoom: 1,
          panX: 0,
          panY: 0,
          video_time: 0,
          is_playing: false,
          exhibit_label: '',
          live_markup: null,
        });

        if (!cancelled) {
          setRecordId(created.id);
          setWitnessState(created);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    const unsub = base44.entities.WitnessState.subscribe((event) => {
      if (event.data?.room_id !== ROOM_ID) return;
      setRecordId(event.id);
      setWitnessState(event.data);
    });

    return unsub;
  }, []);

  const update = useCallback((patch) => {
    if (!recordId) return;
    pendingRef.current = { ...pendingRef.current, ...patch };
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const toSend = pendingRef.current;
      pendingRef.current = {};
      base44.entities.WitnessState.update(recordId, toSend);
    }, 80);
  }, [recordId]);

  return { witnessState, update };
}