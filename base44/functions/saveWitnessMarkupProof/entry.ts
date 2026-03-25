import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function sanitizePart(value, fallback = 'Untitled') {
  return String(value || fallback)
    .replace(/[\\/?%*:|"<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function getPrimaryExhibitNumber(proof = {}) {
  return proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.joint_exhibit_num || proof?.draft_exhibit_num || '';
}

function getInheritedJointExhibitNumber(proof = {}) {
  return proof?.joint_exhibit_num || proof?.admitted_exhibit_num || proof?.demonstrative_exhibit_num || proof?.draft_exhibit_num || '';
}

function buildTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

function decodeBase64(base64Value) {
  const cleaned = String(base64Value || '').replace(/^data:.*;base64,/, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { parentProof, pageNumber, witnessName, pdfBase64, markup, highlights } = body || {};

    if (!parentProof?.id || !pdfBase64) {
      return Response.json({ error: 'parentProof and pdfBase64 are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
    const settings = await base44.entities.AppSettings.list();
    const appSettings = settings[0] || {};
    const targetFolder = String(appSettings.dropbox_extract_folder || '/Case Presenter/Extracts').replace(/\/+$/, '');
    const exhibitLabel = sanitizePart(getPrimaryExhibitNumber(parentProof) || parentProof.name || 'Untitled');
    const safeWitnessName = sanitizePart(witnessName || 'Witness');
    const safePageNumber = Number(pageNumber) > 0 ? Number(pageNumber) : 1;
    const baseName = `${exhibitLabel} - ${safeWitnessName} - Witness Markup - Page ${safePageNumber}`;
    const fileName = `${baseName} - ${buildTimestamp()}.pdf`;
    const uploadPath = `${targetFolder}/${fileName}`;
    const fileBytes = decodeBase64(pdfBase64);
    const parties = await base44.entities.Party.list();
    const matchedParty = parties.find((party) => `${party.first_name || ''} ${party.last_name || ''}`.trim().toLowerCase() === safeWitnessName.toLowerCase());

    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: uploadPath,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
      },
      body: fileBytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return Response.json({ error: `Dropbox upload failed: ${errorText}` }, { status: 500 });
    }

    const uploadedFile = await uploadResponse.json();
    const createdProof = await base44.entities.Proof.create({
      proof_category: 'Exhibit',
      file_type: 'PDF',
      proof_child_type: 'ExtractClip',
      name: uploadedFile.name,
      formal_name: uploadedFile.name,
      description: `Witness markup saved from ${parentProof.name || 'proof'} page ${safePageNumber}`,
      parent_proof_id: parentProof.id,
      party_id: matchedParty?.id || parentProof.party_id,
      category_id: parentProof.category_id || null,
      proof_type_category_id: parentProof.proof_type_category_id,
      status: 'Draft',
      joint_exhibit_num: null,
      joint_by: null,
      joint_date: null,
      admitted_exhibit_num: null,
      admitted_by: null,
      admit_date: null,
      demonstrative_exhibit_num: null,
      file_source: 'dropbox',
      dropbox_file_id: uploadedFile.id,
      dropbox_path: uploadedFile.path_display,
      dropbox_file_name: uploadedFile.name,
      original_dropbox_file_id: uploadedFile.id,
      original_dropbox_path: uploadedFile.path_display,
      original_dropbox_file_name: uploadedFile.name,
      extract_pages: String(safePageNumber),
      clipped_page: safePageNumber,
      highlights: Array.isArray(highlights) ? highlights : [],
      witness_name: safeWitnessName,
      witness_markup: markup || {},
    });

    const witnessStateRecords = await base44.asServiceRole.entities.WitnessState.filter({ room_id: 'case-presenter-witness' });
    if (witnessStateRecords[0]?.id) {
      await base44.asServiceRole.entities.WitnessState.update(witnessStateRecords[0].id, {
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

    return Response.json({ proof: createdProof });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});