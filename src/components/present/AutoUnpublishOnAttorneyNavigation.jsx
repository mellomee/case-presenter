import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const ATTORNEY_PATHS = ['/present/attorney', '/AttorneyHub'];
const ATTORNEY_VIEW_NAV_LABELS = ['Previous', 'Next', 'Start Admitted Questions'];
const IGNORE_LABEL_MATCHER = /publish|unpublish|jury view|exit to dashboard/i;
const JURY_ROOM_ID = 'case-presenter-trial';

function isAttorneyPath(pathname) {
  return ATTORNEY_PATHS.includes(pathname);
}

function resetJuryState(recordId) {
  return base44.entities.JuryState.update(recordId, {
    published_proof_id: null,
    pdf_page: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    video_time: 0,
    is_playing: false,
    is_blank: true,
    exhibit_label: '',
    attorney_markup: { strokes: [], highlights: [] },
  });
}

function getInteractiveLabel(target) {
  if (!(target instanceof Element)) return '';
  const node = target.closest('button, a, [role="button"]');
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function shouldAutoUnpublishFromClick(pathname, event) {
  if (!(event.target instanceof Element)) return false;

  const label = getInteractiveLabel(event.target);
  if (IGNORE_LABEL_MATCHER.test(label)) return false;

  if (pathname === '/present/attorney') {
    if (ATTORNEY_VIEW_NAV_LABELS.includes(label)) return true;
    return event.clientX <= 280;
  }

  if (pathname === '/AttorneyHub') {
    return event.clientX <= Math.min(window.innerWidth * 0.55, 920);
  }

  return false;
}

export default function AutoUnpublishOnAttorneyNavigation() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const juryStateRef = useRef(null);
  const recordIdRef = useRef(null);

  useEffect(() => {
    const wasAttorneyPath = isAttorneyPath(previousPathRef.current);
    const isNowAttorneyPath = isAttorneyPath(location.pathname);

    if (
      wasAttorneyPath &&
      !isNowAttorneyPath &&
      recordIdRef.current &&
      juryStateRef.current?.published_proof_id &&
      !juryStateRef.current?.is_blank
    ) {
      resetJuryState(recordIdRef.current);
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!isAttorneyPath(location.pathname)) return;

    let isActive = true;

    base44.entities.JuryState.filter({ room_id: JURY_ROOM_ID }).then((records) => {
      if (!isActive) return;
      const current = records[0] || null;
      recordIdRef.current = current?.id || null;
      juryStateRef.current = current;
    });

    const unsubscribe = base44.entities.JuryState.subscribe((event) => {
      if (event.data?.room_id !== JURY_ROOM_ID) return;
      recordIdRef.current = event.id;
      juryStateRef.current = event.data;
    });

    const handlePointerDown = (event) => {
      if (!recordIdRef.current || !juryStateRef.current?.published_proof_id || juryStateRef.current?.is_blank) return;
      if (shouldAutoUnpublishFromClick(location.pathname, event)) {
        resetJuryState(recordIdRef.current);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      isActive = false;
      document.removeEventListener('pointerdown', handlePointerDown, true);
      unsubscribe();
    };
  }, [location.pathname]);

  return null;
}