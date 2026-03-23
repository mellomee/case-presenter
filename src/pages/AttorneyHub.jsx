import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ChevronLeft, ChevronRight, Layers3, LayoutGrid, List, Pause, Play, Square } from 'lucide-react';
import ProofPreviewPane from '@/components/attorneyView/ProofPreviewPane.jsx';
import { useJurySync } from '@/components/attorneyView/useJurySync.jsx';
import ProofThumbPreview from '@/components/attorneyHub/ProofThumbPreview.jsx';
import ProofCardMenu from '@/components/attorneyHub/ProofCardMenu.jsx';
import AttorneyHubQuestionList from '@/components/attorneyHub/AttorneyHubQuestionList.jsx';
import AdmitAsExhibitModal from '@/components/proofVault/AdmitAsExhibitModal';
import AdmitAsDemonstrativeModal from '@/components/proofVault/AdmitAsDemonstrativeModal';
import UnAdmitModal from '@/components/proofVault/UnAdmitModal';
import GroupPreviewPane from '@/components/attorneyHub/GroupPreviewPane.jsx';
import ColumnResizeHandle from '@/components/attorneyHub/ColumnResizeHandle.jsx';
import useStoredSplitWidths from '@/hooks/useStoredSplitWidths';
import { getJointLabel, getProofDisplayName, getProofSide, getProofTypeLabel, parseIdsField } from '@/lib/examV2Utils';

function proofMatchesParty(proof, partyId) {
  if (!partyId || partyId === 'all') return true;
  const attachedPartyIds = parseIdsField(proof?.party_ids);
  return attachedPartyIds.includes(partyId) || proof?.party_id === partyId;
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getProofPartySearchText(proof, partiesById) {
  const partyIds = [...new Set([proof?.party_id, ...parseIdsField(proof?.party_ids)].filter(Boolean))];
  return partyIds
    .map((partyId) => {
      const party = partiesById[partyId];
      return party ? `${party.first_name} ${party.last_name}`.trim() : '';
    })
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function compareLabeledNumbers(aValue, bValue, direction = 'asc') {
  const a = String(aValue || '').trim();
  const b = String(bValue || '').trim();

  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const comparison = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'desc' ? comparison * -1 : comparison;
}

function getStoredHubSetting(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value ?? fallback;
}

function ToolbarSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ colorScheme: 'light' }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-300 focus:outline-none"
    >
      {children}
    </select>
  );
}

const PARTY_SIDE_ORDER = ['Plaintiff', 'Defense', 'Neutral'];

function comparePartiesByFirstName(a, b) {
  const firstComparison = String(a?.first_name || '').localeCompare(String(b?.first_name || ''), undefined, { sensitivity: 'base' });
  if (firstComparison !== 0) return firstComparison;
  return String(a?.last_name || '').localeCompare(String(b?.last_name || ''), undefined, { sensitivity: 'base' });
}

function renderGroupedPartyOptions(parties = [], { placeholderLabel = null, allLabel = null } = {}) {
  const groups = PARTY_SIDE_ORDER
    .map((side) => ({
      side,
      items: [...parties].filter((party) => party.side === side).sort(comparePartiesByFirstName),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {placeholderLabel ? <option value="">{placeholderLabel}</option> : null}
      {allLabel ? <option value="all">{allLabel}</option> : null}
      {groups.map((group, index) => (
        <React.Fragment key={group.side}>
          {index > 0 ? <option disabled>──────────</option> : null}
          <option disabled>{group.side}</option>
          {group.items.map((party) => <option key={party.id} value={party.id}>{party.first_name} {party.last_name}</option>)}
        </React.Fragment>
      ))}
    </>
  );
}

const LOS_ANGELES_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles',
});

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function canPublishProof(proof) {
  return proof?.proof_category === 'Deposition' || ['Admitted', 'Demonstrative'].includes(proof?.status);
}

function getPublishedLabel(proof) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return proof.formal_name || proof.name || 'Deposition';

  const exhibitNumber = proof.admitted_exhibit_num || proof.demonstrative_exhibit_num || proof.joint_exhibit_num || '';
  if (proof.status === 'Demonstrative') {
    return exhibitNumber ? `Demonstrative ${exhibitNumber}` : 'Demonstrative';
  }
  return exhibitNumber ? `Exhibit ${exhibitNumber}` : 'Exhibit';
}

function getAdmissionToolbarLabel(proof, localDecision) {
  if (!proof) return '';
  if (proof.proof_category === 'Deposition') return 'Deposition';
  if (localDecision === 'not_admitted') return 'Admit Rejected';
  if (proof.status === 'Admitted') return 'Admitted: Exhibit';
  if (proof.status === 'Demonstrative') return 'Admitted: Demo';
  return 'Unadmitted';
}

function getAdmissionToolbarClass(proof, localDecision) {
  if (!proof) return 'border-slate-200 bg-slate-50 text-slate-700';
  if (proof.proof_category === 'Deposition') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (localDecision === 'not_admitted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (proof.status === 'Admitted') return 'border-green-200 bg-green-50 text-green-700';
  if (proof.status === 'Demonstrative') return 'border-purple-200 bg-purple-50 text-purple-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function AttorneyHub() {
  const queryClient = useQueryClient();
  const { juryState, update } = useJurySync('attorney');
  const [selectedExamType, setSelectedExamType] = useState(() => getStoredHubSetting('attorney-hub-exam-type', 'Direct'));
  const [proofTab, setProofTab] = useState(() => getStoredHubSetting('attorney-hub-tab', 'Exam'));
  const [selectedExamPartyId, setSelectedExamPartyId] = useState(() => getStoredHubSetting('attorney-hub-exam-party', ''));
  const [depositionPartyFilter, setDepositionPartyFilter] = useState(() => getStoredHubSetting('attorney-hub-deposition-party', 'all'));
  const [statusFilter, setStatusFilter] = useState(() => getStoredHubSetting('attorney-hub-status', 'all'));
  const [sideFilter, setSideFilter] = useState(() => getStoredHubSetting('attorney-hub-side', 'all'));
  const [exhibitSort, setExhibitSort] = useState(() => getStoredHubSetting('attorney-hub-exhibit-sort', 'joint-asc'));
  const [exhibitSearch, setExhibitSearch] = useState(() => getStoredHubSetting('attorney-hub-exhibit-search', ''));
  const [viewMode, setViewMode] = useState(() => getStoredHubSetting('attorney-hub-view-mode', 'list'));
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(() => getStoredHubSetting('attorney-hub-left-collapsed', 'false') === 'true');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedPreviewProof, setSelectedPreviewProof] = useState(null);
  const [localDecisionMap, setLocalDecisionMap] = useState({});
  const [selectedProofForModal, setSelectedProofForModal] = useState(null);
  const [showAdmitExhibitModal, setShowAdmitExhibitModal] = useState(false);
  const [showAdmitDemoModal, setShowAdmitDemoModal] = useState(false);
  const [showUnAdmitModal, setShowUnAdmitModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTimeLabel, setCurrentTimeLabel] = useState(() => LOS_ANGELES_TIME_FORMATTER.format(new Date()));
  const { widths, startDrag } = useStoredSplitWidths('attorney-hub-split-widths', {
    left: 430,
    middle: 360,
    right: 620,
  });

  const { data: parties = [] } = useQuery({ queryKey: ['hubParties'], queryFn: () => base44.entities.Party.list() });
  const { data: proofs = [] } = useQuery({ queryKey: ['proofs'], queryFn: () => base44.entities.Proof.list() });
  const { data: exams = [] } = useQuery({ queryKey: ['hubExamsV2'], queryFn: () => base44.entities.ExamV2.list() });
  const { data: examItems = [] } = useQuery({ queryKey: ['hubExamItemsV2'], queryFn: () => base44.entities.ExamItemV2.list() });
  const { data: admissionTemplates = [] } = useQuery({ queryKey: ['hubAdmissionTemplates'], queryFn: () => base44.entities.AdmissionTemplate.list() });
  const { data: admissionBlocks = [] } = useQuery({ queryKey: ['hubAdmissionBlocks'], queryFn: () => base44.entities.AdmissionBlock.list() });

  const activePartyId = proofTab === 'Exam'
    ? selectedExamPartyId
    : proofTab === 'Depositions'
      ? (depositionPartyFilter === 'all' ? '' : depositionPartyFilter)
      : '';

  const selectedParty = parties.find((party) => party.id === activePartyId) || null;
  const currentExam = exams.find((exam) => exam.party_id === selectedExamPartyId && exam.exam_type === selectedExamType) || null;
  const currentExamItems = useMemo(() => examItems.filter((item) => item.exam_id === currentExam?.id), [examItems, currentExam]);
  const rootProofItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'proof' && !item.parent_item_id), [currentExamItems]);
  const rootGroups = useMemo(() => currentExamItems.filter((item) => item.item_type === 'group' && !item.parent_item_id), [currentExamItems]);
  const proofsById = useMemo(() => Object.fromEntries(proofs.map((proof) => [proof.id, proof])), [proofs]);
  const partiesById = useMemo(() => Object.fromEntries(parties.map((party) => [party.id, party])), [parties]);
  const rootProofOrderMap = useMemo(() => Object.fromEntries(rootProofItems.map((item) => [item.linked_proof_id, item.sort_order || 0])), [rootProofItems]);
  const rootExamOrderNumberMap = useMemo(() => {
    const orderedRootItems = currentExamItems
      .filter((item) => !item.parent_item_id && item.item_type !== 'question')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return Object.fromEntries(orderedRootItems.map((item, index) => [item.id, index + 1]));
  }, [currentExamItems]);
  const rootProofOrderNumberMap = useMemo(
    () => Object.fromEntries(rootProofItems.map((item) => [item.linked_proof_id, rootExamOrderNumberMap[item.id]])),
    [rootProofItems, rootExamOrderNumberMap]
  );

  const updateProofMutation = useMutation({
    mutationFn: ({ proofId, data }) => base44.entities.Proof.update(proofId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proofs'] }),
  });

  const exhibitProofs = useMemo(
    () => proofs.filter((proof) => proof.proof_category === 'Exhibit' && ['Joint', 'Admitted', 'Demonstrative'].includes(proof.status)),
    [proofs]
  );

  const parentDepositions = useMemo(
    () => proofs.filter((proof) => !proof.parent_proof_id && proof.proof_category === 'Deposition'),
    [proofs]
  );

  const filteredProofs = useMemo(() => {
    if (proofTab === 'Depositions') {
      return parentDepositions.filter((proof) => proofMatchesParty(proof, depositionPartyFilter));
    }

    if (proofTab === 'Exam') {
      if (!currentExam) return [];
      return rootProofItems.map((item) => proofsById[item.linked_proof_id]).filter(Boolean);
    }

    let next = [...exhibitProofs];

    if (statusFilter !== 'all') {
      next = next.filter((proof) => {
        if (statusFilter === 'joint') return proof.status === 'Joint';
        if (statusFilter === 'admitted') return proof.status === 'Admitted';
        if (statusFilter === 'demonstrative') return proof.status === 'Demonstrative';
        return true;
      });
    }

    if (sideFilter !== 'all') {
      next = next.filter((proof) => getProofSide(proof) === sideFilter);
    }

    const searchTerm = normalizeSearchValue(exhibitSearch);
    if (searchTerm) {
      next = next.filter((proof) => {
        const searchableValues = [
          proof.name,
          proof.formal_name,
          proof.joint_exhibit_num,
          proof.admitted_exhibit_num,
          proof.demonstrative_exhibit_num,
          getProofPartySearchText(proof, partiesById),
        ];

        return searchableValues.some((value) => normalizeSearchValue(value).includes(searchTerm));
      });
    }

    const [sortField, sortDirection] = exhibitSort.split('-');
    return [...next].sort((a, b) => {
      const aValue = sortField === 'admit' ? (a.admitted_exhibit_num || a.demonstrative_exhibit_num) : a.joint_exhibit_num;
      const bValue = sortField === 'admit' ? (b.admitted_exhibit_num || b.demonstrative_exhibit_num) : b.joint_exhibit_num;
      return compareLabeledNumbers(aValue, bValue, sortDirection);
    });
  }, [currentExam, depositionPartyFilter, exhibitSearch, exhibitSort, exhibitProofs, parentDepositions, partiesById, proofTab, proofsById, rootProofItems, sideFilter, statusFilter]);

  const displayEntries = useMemo(() => {
    const proofEntries = filteredProofs.map((proof) => ({ kind: 'proof', id: proof.id }));
    if (proofTab === 'Depositions' || proofTab === 'Exhibits') return proofEntries;

    return currentExamItems
      .filter((item) => !item.parent_item_id && item.item_type !== 'question')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .flatMap((item) => {
        if (item.item_type === 'group') return [{ kind: 'group', id: item.id }];
        if (item.item_type === 'proof') return [{ kind: 'proof', id: item.linked_proof_id }];
        return [];
      });
  }, [currentExamItems, filteredProofs, proofTab]);

  useEffect(() => {
    if (!displayEntries.length) {
      setSelectedKey('');
      return;
    }
    const stillExists = displayEntries.some((entry) => `${entry.kind}:${entry.id}` === selectedKey);
    if (!stillExists) setSelectedKey(`${displayEntries[0].kind}:${displayEntries[0].id}`);
  }, [displayEntries, selectedKey]);

  useEffect(() => {
    setSelectedPreviewProof(null);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedExamPartyId && parties[0]) setSelectedExamPartyId(parties[0].id);
  }, [parties, selectedExamPartyId]);

  useEffect(() => {
    window.localStorage.setItem('attorney-hub-tab', proofTab);
    window.localStorage.setItem('attorney-hub-exam-type', selectedExamType);
    window.localStorage.setItem('attorney-hub-exam-party', selectedExamPartyId || '');
    window.localStorage.setItem('attorney-hub-deposition-party', depositionPartyFilter);
    window.localStorage.setItem('attorney-hub-status', statusFilter);
    window.localStorage.setItem('attorney-hub-side', sideFilter);
    window.localStorage.setItem('attorney-hub-exhibit-sort', exhibitSort);
    window.localStorage.setItem('attorney-hub-exhibit-search', exhibitSearch);
    window.localStorage.setItem('attorney-hub-view-mode', viewMode);
    window.localStorage.setItem('attorney-hub-left-collapsed', leftColumnCollapsed ? 'true' : 'false');
  }, [proofTab, selectedExamType, selectedExamPartyId, depositionPartyFilter, statusFilter, sideFilter, exhibitSort, exhibitSearch, viewMode, leftColumnCollapsed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeLabel(LOS_ANGELES_TIME_FORMATTER.format(new Date()));
      setElapsedSeconds((prev) => (isTimerRunning ? prev + 1 : prev));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  const [selectedKind, selectedId] = selectedKey.split(':');
  const selectedProof = selectedKind === 'proof' ? proofsById[selectedId] : null;
  const selectedGroup = selectedKind === 'group' ? rootGroups.find((item) => item.id === selectedId) || null : null;
  const selectedProofRootItem = selectedProof ? rootProofItems.find((item) => item.linked_proof_id === selectedProof.id) || null : null;
  const fallbackAdmissionBlock = selectedProof ? admissionBlocks.find((item) => item.proof_id === selectedProof.id && item.party_id === activePartyId) || null : null;
  const admissionSource = selectedProof
    ? selectedProofRootItem?.step_overrides
      ? { proof_type_category_id: selectedProof.proof_type_category_id, step_overrides: selectedProofRootItem.step_overrides }
      : fallbackAdmissionBlock || { proof_type_category_id: selectedProof.proof_type_category_id, step_overrides: {} }
    : null;
  const questionParentId = selectedProof ? selectedProofRootItem?.id : selectedGroup?.id;
  const questionItems = useMemo(() => currentExamItems.filter((item) => item.item_type === 'question'), [currentExamItems]);
  const leftPanelWidth = leftColumnCollapsed ? 72 : widths.left;
  const activeToolbarProof = (selectedPreviewProof?.id ? proofsById[selectedPreviewProof.id] : null) || selectedProof;
  const selectedProofIsPublished = juryState?.published_proof_id === activeToolbarProof?.id && !juryState?.is_blank;
  const selectedProofCanPublish = canPublishProof(activeToolbarProof);
  const selectedProofAdmissionLabel = getAdmissionToolbarLabel(activeToolbarProof, localDecisionMap[activeToolbarProof?.id]);

  const handleProofAction = (proof, action, patch = null) => {
    if (action === 'not_admitted') {
      setLocalDecisionMap((prev) => ({ ...prev, [proof.id]: prev[proof.id] === 'not_admitted' ? null : 'not_admitted' }));
      return;
    }

    if (action === 'admit') {
      setSelectedProofForModal(proof);
      setShowAdmitExhibitModal(true);
      return;
    }

    if (action === 'demo') {
      setSelectedProofForModal(proof);
      setShowAdmitDemoModal(true);
      return;
    }

    if (action === 'unadmit') {
      setSelectedProofForModal(proof);
      setShowUnAdmitModal(true);
      return;
    }

    setLocalDecisionMap((prev) => ({ ...prev, [proof.id]: null }));
    if (patch) {
      updateProofMutation.mutate({ proofId: proof.id, data: patch });
    }
  };

  const publishProof = (proof) => {
    if (!canPublishProof(proof)) return;
    update({
      published_proof_id: proof.id,
      pdf_page: 1,
      zoom: 1,
      panX: 0,
      panY: 0,
      video_time: 0,
      is_playing: false,
      is_blank: false,
      exhibit_label: getPublishedLabel(proof),
    });
  };

  const unpublishProof = (proof) => {
    if (juryState?.published_proof_id !== proof?.id || juryState?.is_blank) return;
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
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-white p-4 lg:p-6">
      <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden flex flex-col">
        <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setIsTimerRunning(true)}
                className="h-11 w-11 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Start"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => setIsTimerRunning(false)}
                className="h-11 w-11 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Pause"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setElapsedSeconds(0);
                }}
                className="h-11 w-11 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Stop and reset"
              >
                <Square className="w-[18px] h-[18px] fill-current" />
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
              {formatElapsedTime(elapsedSeconds)}
            </div>
          </div>

          <div className="min-w-[18rem] flex-1">
            {activeToolbarProof ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{getProofDisplayName(activeToolbarProof)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getAdmissionToolbarClass(activeToolbarProof, localDecisionMap[activeToolbarProof.id])}`}>
                        {selectedProofAdmissionLabel}
                      </span>
                      {selectedProofIsPublished && <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Published</span>}
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{getProofTypeLabel(activeToolbarProof)}</span>
                    </div>
                  </div>
                  <ProofCardMenu
                    proof={activeToolbarProof}
                    localDecision={localDecisionMap[activeToolbarProof.id]}
                    onAction={(action, patch) => handleProofAction(activeToolbarProof, action, patch)}
                    canPublish={selectedProofCanPublish}
                    isPublished={selectedProofIsPublished}
                    onPublish={() => publishProof(activeToolbarProof)}
                    onUnpublish={() => unpublishProof(activeToolbarProof)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                Select a proof to see its admit/publish toolbar here.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
            {currentTimeLabel}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden xl:flex xl:min-w-0">
          <div style={{ width: `${leftPanelWidth}px` }} className={`border-r border-slate-800 flex flex-col min-h-0 xl:flex-shrink-0 ${leftColumnCollapsed ? 'xl:min-w-[72px]' : 'xl:min-w-[320px]'}`}>
            <div className={`border-b border-slate-800 ${leftColumnCollapsed ? 'px-2 py-3' : 'px-4 pt-4'}`}>
              <div className={`mb-4 ${leftColumnCollapsed ? 'space-y-2' : 'space-y-3'}`}>
                <div className={`flex ${leftColumnCollapsed ? 'justify-center' : 'justify-end'}`}>
                  <button
                    type="button"
                    onClick={() => setLeftColumnCollapsed((value) => !value)}
                    className="h-11 w-11 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm hover:text-slate-700"
                    title={leftColumnCollapsed ? 'Expand left column' : 'Collapse left column'}
                  >
                    {leftColumnCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </button>
                </div>
                {!leftColumnCollapsed && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex max-w-full rounded-lg border border-slate-200 bg-white p-1 gap-1 overflow-x-auto shadow-sm">
                      {['Exam', 'Exhibits', 'Depositions'].map((tab) => (
                        <button key={tab} type="button" onClick={() => setProofTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap ${proofTab === tab ? 'bg-blue-600 text-white [&_svg]:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 gap-1 flex-shrink-0 shadow-sm">
                      <button type="button" onClick={() => setViewMode('grid')} className={`h-11 w-11 rounded-md flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-600 text-white [&_svg]:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title="Thumbnail view">
                        <LayoutGrid className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => setViewMode('list')} className={`h-11 w-11 rounded-md flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-600 text-white [&_svg]:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title="List view">
                        <List className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!leftColumnCollapsed && (proofTab === 'Exam' ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={selectedExamPartyId} onChange={setSelectedExamPartyId}>
                    {renderGroupedPartyOptions(parties, { placeholderLabel: 'Select party' })}
                  </ToolbarSelect>
                  <ToolbarSelect value={selectedExamType} onChange={setSelectedExamType}>
                    <option value="Direct">Direct</option>
                    <option value="Cross">Cross</option>
                  </ToolbarSelect>
                </div>
              ) : proofTab === 'Exhibits' ? (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={statusFilter} onChange={setStatusFilter}>
                    <option value="all">All Joint/Admitted/Demo</option>
                    <option value="joint">Joint Only</option>
                    <option value="admitted">Admitted Exhibits</option>
                    <option value="demonstrative">Demonstratives</option>
                  </ToolbarSelect>
                  <ToolbarSelect value={sideFilter} onChange={setSideFilter}>
                    <option value="all">All Sides</option>
                    <option value="Plaintiff">Plaintiff</option>
                    <option value="Defense">Defense</option>
                  </ToolbarSelect>
                  <ToolbarSelect value={exhibitSort} onChange={setExhibitSort}>
                    <option value="joint-asc">Joint # ↑</option>
                    <option value="joint-desc">Joint # ↓</option>
                    <option value="admit-asc">Admitted # ↑</option>
                    <option value="admit-desc">Admitted # ↓</option>
                  </ToolbarSelect>
                  <input
                    value={exhibitSearch}
                    onChange={(event) => setExhibitSearch(event.target.value)}
                    placeholder="Search title, exhibit #, or party"
                    className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <ToolbarSelect value={depositionPartyFilter} onChange={setDepositionPartyFilter}>
                    {renderGroupedPartyOptions(parties, { allLabel: 'All Parties' })}
                  </ToolbarSelect>
                </div>
              ))}
            </div>

            <div className={`flex-1 min-h-0 ${leftColumnCollapsed ? 'overflow-hidden p-2' : 'attorney-hub-scrollbar overflow-y-auto overscroll-contain p-4 pr-3 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]'}`}>
              {leftColumnCollapsed ? (
                <div className="attorney-hub-scrollbar flex h-full min-h-0 flex-col items-center gap-2 overflow-y-scroll overscroll-contain pr-1 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
                  {displayEntries.map((entry) => {
                    const isSelected = selectedKey === `${entry.kind}:${entry.id}`;
                    const proof = entry.kind === 'proof' ? proofsById[entry.id] : null;
                    const group = entry.kind === 'group' ? rootGroups.find((item) => item.id === entry.id) : null;

                    return (
                      <button
                        key={`${entry.kind}:${entry.id}`}
                        type="button"
                        onClick={() => setSelectedKey(`${entry.kind}:${entry.id}`)}
                        className={`rounded-xl border p-1.5 ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'}`}
                      >
                        {proof ? <ProofThumbPreview proof={proof} size="sm" /> : <ProofThumbPreview groupLabel={group?.label || 'Group'} size="sm" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {displayEntries.map((entry) => {
                  const isSelected = selectedKey === `${entry.kind}:${entry.id}`;

                  if (entry.kind === 'group') {
                    const group = rootGroups.find((item) => item.id === entry.id);

                    return viewMode === 'grid' ? (
                      <div key={entry.id} onClick={() => setSelectedKey(`group:${entry.id}`)} className={`rounded-2xl border p-3 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                        <div className="flex items-start justify-between gap-2">
                          {rootExamOrderNumberMap[group?.id] ? <span className="inline-flex h-5 items-center justify-center rounded-full bg-blue-600/20 px-2 text-[10px] font-semibold text-blue-300">Question {rootExamOrderNumberMap[group.id]}</span> : <span />}
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Group</span>
                        </div>
                        <div className="mt-3 flex justify-center">
                          <ProofThumbPreview groupLabel={group?.label || 'No Proof'} size="lg" />
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm font-semibold text-white leading-snug">{group?.label || 'Untitled Group'}</p>
                          <p className="mt-1 text-[11px] text-slate-400">No Proof</p>
                        </div>
                      </div>
                    ) : (
                      <div key={entry.id} onClick={() => setSelectedKey(`group:${entry.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer flex items-center gap-4 ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="flex items-center gap-4 min-w-0">
                            <ProofThumbPreview groupLabel={group?.label || 'No Proof'} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {rootExamOrderNumberMap[group?.id] && <span className="inline-flex h-5 items-center justify-center rounded-full bg-blue-600/20 px-2 text-[10px] font-semibold text-blue-300">Question {rootExamOrderNumberMap[group.id]}</span>}
                                <p className="text-sm font-semibold text-white leading-snug">{group?.label || 'Untitled Group'}</p>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">Question Group</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Group</span>
                        </div>
                      </div>
                    );
                  }

                  const proof = proofsById[entry.id];
                  if (!proof) return null;
                  const children = proofs.filter((item) => item.parent_proof_id === proof.id);
                  const parentProof = proof.parent_proof_id ? proofsById[proof.parent_proof_id] : null;
                  const isDemo = proof.status === 'Demonstrative';
                  const isAdmitted = proof.status === 'Admitted';
                  const publishable = canPublishProof(proof);
                  const isPublished = juryState?.published_proof_id === proof.id && !juryState?.is_blank;

                  return viewMode === 'grid' ? (
                    <div key={proof.id} onClick={() => setSelectedKey(`proof:${proof.id}`)} className={`rounded-2xl border p-3 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                      <div className="flex items-start justify-between gap-2">
                        {proofTab === 'Exam' && rootProofOrderNumberMap[proof.id] ? <span className="inline-flex h-5 items-center justify-center rounded-full bg-blue-600/20 px-2 text-[10px] font-semibold text-blue-300">Question {rootProofOrderNumberMap[proof.id]}</span> : <span />}
                        <div className="flex flex-col items-end gap-2">
                          {(isAdmitted || isDemo) && <CheckCircle2 className={`w-5 h-5 ${isDemo ? 'text-blue-400' : 'text-red-400'}`} />}
                          <ProofCardMenu
                            proof={proof}
                            selectedParty={selectedParty}
                            localDecision={localDecisionMap[proof.id]}
                            onAction={(action, patch) => handleProofAction(proof, action, patch)}
                            canPublish={publishable}
                            isPublished={isPublished}
                            onPublish={() => publishProof(proof)}
                            onUnpublish={() => unpublishProof(proof)}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-center">
                        <ProofThumbPreview proof={proof} size="lg" />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-sm font-semibold text-white leading-snug">{proof.name || getProofDisplayName(proof)}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{proof.status}</p>
                      </div>
                      <div className="mt-3 text-center text-xs text-slate-400">
                        {getProofTypeLabel(proof)}
                      </div>
                    </div>
                  ) : (
                    <div key={proof.id} onClick={() => setSelectedKey(`proof:${proof.id}`)} className={`rounded-2xl border p-3 text-left cursor-pointer flex items-start gap-4 ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-start gap-4 min-w-0">
                          <ProofThumbPreview proof={proof} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {proofTab === 'Exam' && rootProofOrderNumberMap[proof.id] && <span className="inline-flex h-5 items-center justify-center rounded-full bg-blue-600/20 px-2 text-[10px] font-semibold text-blue-300">Question {rootProofOrderNumberMap[proof.id]}</span>}
                              <p className="text-sm font-semibold text-white leading-snug">{proof.name || getProofDisplayName(proof)}</p>
                            </div>
                            <div className="mt-2 flex items-center justify-start gap-2 text-xs flex-wrap">
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{getProofTypeLabel(proof)}</span>
                              {parentProof && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">Child of {getProofDisplayName(parentProof)}</span>}
                              {isPublished && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-300">Published</span>}
                              {localDecisionMap[proof.id] === 'not_admitted' && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">Admission Rejected</span>}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{proof.status}</p>
                            {proofTab === 'Depositions' && children.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {children.slice(0, 4).map((child) => (
                                  <button key={child.id} type="button" onClick={(event) => { event.stopPropagation(); setSelectedKey(`proof:${child.id}`); }} className="rounded-lg border border-slate-700 bg-slate-900/70 p-1.5 hover:border-blue-500">
                                    <ProofThumbPreview proof={child} size="sm" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {(isAdmitted || isDemo) && <CheckCircle2 className={`w-5 h-5 ${isDemo ? 'text-blue-400' : 'text-red-400'}`} />}
                          <ProofCardMenu
                            proof={proof}
                            selectedParty={selectedParty}
                            localDecision={localDecisionMap[proof.id]}
                            onAction={(action, patch) => handleProofAction(proof, action, patch)}
                            canPublish={publishable}
                            isPublished={isPublished}
                            onPublish={() => publishProof(proof)}
                            onUnpublish={() => unpublishProof(proof)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>

          <ColumnResizeHandle onMouseDown={startDrag.left} />

          <div style={{ width: `${widths.middle}px` }} className="border-r border-slate-800 min-h-0 overflow-hidden p-4 flex flex-col xl:flex-shrink-0 xl:min-w-[320px]">
            {(selectedProof || selectedGroup) ? (
              <AttorneyHubQuestionList
                title={selectedProof ? getProofDisplayName(selectedProof) : selectedGroup?.label}
                selectedProof={selectedProof}
                parentItemId={questionParentId}
                questionItems={questionItems}
                proofsById={proofsById}
                admissionSource={selectedProof ? admissionSource : null}
                admissionTemplates={admissionTemplates}
                exhibitNum={selectedProof?.joint_exhibit_num || selectedProof?.admitted_exhibit_num || ''}
                onSelectInlineProof={(proof) => setSelectedPreviewProof(proof)}
              />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 flex items-center justify-center text-center p-8">
                <div>
                  <Layers3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-slate-300">Questions</p>
                  <p className="mt-2 text-sm text-slate-500">Select a proof or question group to see its questions here.</p>
                </div>
              </div>
            )}
          </div>

          <ColumnResizeHandle onMouseDown={startDrag.right} />

          <div style={{ width: `${widths.right}px` }} className="min-h-0 p-4 xl:flex-shrink-0 xl:min-w-[420px] xl:flex-1">
            {(selectedPreviewProof || selectedProof) ? (
              <div className="h-full min-h-[42rem] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <ProofPreviewPane
                  proof={selectedPreviewProof || selectedProof}
                  juryState={juryState}
                  onUpdateJury={update}
                  onRuling={({ proofId, data }) => updateProofMutation.mutate({ proofId, data })}
                  onClose={() => setSelectedPreviewProof(null)}
                />
              </div>
            ) : selectedGroup ? (
              <GroupPreviewPane label={selectedGroup.label} />
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 flex items-center justify-center text-center p-10">
                <div>
                  <Layers3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-slate-300">Attorney Hub</p>
                  <p className="mt-2 text-sm text-slate-500">Pick a proof or question group from the left panel to preview it here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <AdmitAsExhibitModal
          open={showAdmitExhibitModal}
          onClose={() => {
            setShowAdmitExhibitModal(false);
            setSelectedProofForModal(null);
            queryClient.invalidateQueries({ queryKey: ['proofs'] });
          }}
          proof={selectedProofForModal}
        />
        <AdmitAsDemonstrativeModal
          open={showAdmitDemoModal}
          onClose={() => {
            setShowAdmitDemoModal(false);
            setSelectedProofForModal(null);
            queryClient.invalidateQueries({ queryKey: ['proofs'] });
          }}
          proof={selectedProofForModal}
        />
        <UnAdmitModal
          open={showUnAdmitModal}
          onClose={() => {
            setShowUnAdmitModal(false);
            setSelectedProofForModal(null);
            queryClient.invalidateQueries({ queryKey: ['proofs'] });
          }}
          proof={selectedProofForModal}
        />
      </div>
    </div>
  );
}