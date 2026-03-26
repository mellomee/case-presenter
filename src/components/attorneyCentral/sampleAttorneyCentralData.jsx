export const sampleProofs = [
  {
    id: 'sample-proof-exhibit-1',
    proof_category: 'Exhibit',
    file_type: 'Image',
    proof_child_type: null,
    name: 'Downtown Intersection Photo',
    formal_name: 'Plaintiff Exhibit 12',
    status: 'Admitted',
    admitted_exhibit_num: '12',
    joint_exhibit_num: '12',
    admitted_by: 'Plaintiff',
    draft_exhibit_num: 'PX-12',
    file_url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80',
    description: 'Sample admitted exhibit used to preview the large-tile Attorney Central layout.'
  },
  {
    id: 'sample-proof-depo-1',
    proof_category: 'Deposition',
    file_type: 'Video',
    proof_child_type: null,
    name: 'Dr. Smith Video Deposition',
    formal_name: 'Dr. Smith Deposition',
    status: 'Draft',
    video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Sample deposition kept in its own lane from exhibits.'
  }
];

export const sampleQuestions = [
  {
    id: 'sample-question-1',
    text: 'Doctor, this intersection is the same location you visited the night before the collision, correct?',
    expected_answer: 'Yes.',
    type: 'Direct',
    party_id: 'sample-party-1',
    proof_ids: JSON.stringify(['sample-proof-exhibit-1'])
  },
  {
    id: 'sample-question-2',
    text: 'And your deposition testimony about the lighting conditions appears in the video clip we prepared, right?',
    expected_answer: 'Yes.',
    type: 'Cross',
    party_id: 'sample-party-1',
    proof_ids: JSON.stringify(['sample-proof-depo-1'])
  }
];