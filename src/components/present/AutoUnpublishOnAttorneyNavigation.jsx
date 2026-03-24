import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';

const ATTORNEY_PATHS = ['/present/attorney', '/AttorneyHub'];
const ATTORNEY_VIEW_NAV_LABELS = ['Previous', 'Next', 'Start Admitted Questions'];
const IGNORE_LABEL_MATCHER = /publish|unpublish|jury view|exit to dashboard/i;

function isAttorneyPath(pathname) {
  return ATTORNEY_PATHS.includes(pathname);
}

function resetJury(update) {
  update({
    published_proof_id: null,
    pdf_page: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    video_time: 0,
    is_playing: false,
    is_blank: true,
    exhibit_label: '',
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
  const { juryState, update } = useJurySync('attorney');

  useEffect(() => {
    const wasAttorneyPath = isAttorneyPath(previousPathRef.current);
    const isNowAttorneyPath = isAttorneyPath(location.pathname);

    if (
      wasAttorneyPath &&
      !isNowAttorneyPath &&
      juryState?.published_proof_id &&
      !juryState?.is_blank
    ) {
      resetJury(update);
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname, juryState?.published_proof_id, juryState?.is_blank, update]);

  useEffect(() => {
    if (!isAttorneyPath(location.pathname)) return;

    const handlePointerDown = (event) => {
      if (!juryState?.published_proof_id || juryState?.is_blank) return;
      if (shouldAutoUnpublishFromClick(location.pathname, event)) {
        resetJury(update);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [location.pathname, juryState?.published_proof_id, juryState?.is_blank, update]);

  return null;
}