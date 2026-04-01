import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ROOM_ID = 'case-presenter-trial';

/**
 * Shared hook for reading/writing jury screen state.
 * role='attorney' → can write, creates record if missing
 * role='jury'     → read-only subscriber
 */
export function useJurySync(role = 'attorney') {
  const [juryState, setJuryState] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const records = await base44.entities.JuryState.filter({ room_id: ROOM_ID });
      if (cancelled) return;
      if (records.length > 0) {
        setRecordId(records[0].id);
        setJuryState(records[0]);
      } else if (role === 'attorney') {
        const created = await base44.entities.JuryState.create({
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
          attorney_markup: null,
        });
        if (!cancelled) {
          setRecordId(created.id);
          setJuryState(created);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    const unsub = base44.entities.JuryState.subscribe((event) => {
      if (event.data?.room_id !== ROOM_ID) return;
      setRecordId(event.id);
      setJuryState(event.data);
    });
    return unsub;
  }, []);

  const update = useCallback((patch) => {
    if (!recordId) return;
    setJuryState((current) => current ? { ...current, ...patch } : current);
    pendingRef.current = { ...pendingRef.current, ...patch };
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const toSend = pendingRef.current;
      pendingRef.current = {};
      base44.entities.JuryState.update(recordId, toSend);
    }, 80);
  }, [recordId]);

  return { juryState, update };
}