(function () {
  'use strict';

  const BUCKET = 'booking-documents';
  const DOC_TYPES = ['guarantee_form', 'release_order', 'delivery_order'];


  const OUTBOUND_REQUIRED_DOC_TYPES = ['release_order'];


  const PORT_LOCATIONS = ['Mombasa Port (KPA)', 'APM Terminals', 'APM Terminals Mombasa'];


  // Slot / container condition, set at survey time and carried onto whatever
  // slot the container is eventually allocated to.
  const CONDITION_STATUSES = ['full_grade', 'under_repair', 'damaged'];


  function getRequiredDocTypes({ serviceType, origin, destination }) {
    const required = [];
    const originIsPort = PORT_LOCATIONS.indexOf(origin) !== -1;
    const destIsPort = PORT_LOCATIONS.indexOf(destination) !== -1;

    if (serviceType === 'Depot Storage') {
      required.push('guarantee_form');
    }

    if (serviceType === 'Port Haulage' || serviceType === 'Full Transport Package') {
      if (destIsPort && !originIsPort) required.push('release_order');   // going TO port = export
      else if (originIsPort && !destIsPort) required.push('delivery_order'); // coming FROM port = import
      else if (!originIsPort && !destIsPort) required.push('guarantee_form'); // depot-to-depot: container still moves in/out of depot custody at one end
      // both-port case (rare/unlikely) intentionally left unrequired — flag for review if it occurs.

      if (serviceType === 'Full Transport Package' && required.indexOf('guarantee_form') === -1) required.push('guarantee_form');
    }

    return required;
  }

  function client() {
    if (window.ghSupabase) return window.ghSupabase;
    throw new Error('Supabase client not initialised — load script.js first, or provide window.ghSupabase.');
  }

  function assertDocType(docType) {
    if (DOC_TYPES.indexOf(docType) === -1) {
      throw new Error('doc_type must be one of: ' + DOC_TYPES.join(', '));
    }
  }



  async function _uploadDocument({ bookingId, tripId, docType, containerNo, file }) {
    if (!bookingId && !tripId) throw new Error('bookingId or tripId is required');
    if (bookingId && tripId) throw new Error('Provide either bookingId or tripId, not both');
    if (!file) throw new Error('No file selected');
    assertDocType(docType);

    const { data: sessionData } = await client().auth.getSession();
    const userId = sessionData && sessionData.session ? sessionData.session.user.id : null;
    if (!userId) throw new Error('Please sign in before uploading documents.');

    const parentId = bookingId || tripId;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${parentId}/${docType}-${Date.now()}-${safeName}`;

    const { error: uploadErr } = await client()
      .storage.from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadErr) throw new Error(uploadErr.message || 'Upload failed — please try again');

    const { data: row, error: insertErr } = await client()
      .from('booking_documents')
      .insert({
        booking_id: bookingId || null,
        trip_id: tripId || null,
        doc_type: docType,
        container_no: containerNo || null,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size || null,
        uploaded_by: userId,
      })
      .select('*')
      .single();

    if (insertErr) {

      await client().storage.from(BUCKET).remove([path]).catch(() => {});
      throw new Error(insertErr.message || 'Could not record uploaded document');
    }
    return row;
  }

  async function uploadBookingDocument({ bookingId, docType, containerNo, file }) {
    if (!bookingId) throw new Error('bookingId (booking reference) is required');
    return _uploadDocument({ bookingId, docType, containerNo, file });
  }


  async function uploadTripDocument({ tripId, docType, containerNo, file }) {
    if (!tripId) throw new Error('tripId is required');
    return _uploadDocument({ tripId, docType, containerNo, file });
  }


  async function myBookingDocuments(bookingId) {
    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .eq('booking_id', bookingId)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');
    return data || [];
  }


  async function storageAvailability() {
    const { data, error } = await client()
      .from('depot_storage_availability')
      .select('*')
      .order('zone_name');
    if (error) throw new Error(error.message || 'Could not load storage availability');
    return data || [];
  }


  async function reviewQueue(status) {
    let query = client()
      .from('booking_documents')
      .select('*, public_bookings(id, full_name, company, service_type, container, storage_status)');

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('uploaded_at', { ascending: status === 'pending_review' });

    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Could not load review queue');
    return data || [];
  }

  // Back-compat alias for the original pending-only queue.
  async function pendingReviewQueue() {
    return reviewQueue('pending_review');
  }


  async function documentsForBooking(bookingId) {
    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .eq('booking_id', bookingId)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');
    return data || [];
  }



  async function documentsForBookings(bookingIds) {
    const ids = (bookingIds || []).filter(Boolean);
    if (!ids.length) return {};

    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .in('booking_id', ids)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');

    const byBooking = {};
    (data || []).forEach(function (doc) {
      if (!byBooking[doc.booking_id]) byBooking[doc.booking_id] = [];
      byBooking[doc.booking_id].push(doc);
    });
    return byBooking;
  }


  async function documentsForTrip(tripId) {
    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');
    return data || [];
  }

  async function documentsForTrips(tripIds) {
    const ids = (tripIds || []).filter(Boolean);
    if (!ids.length) return {};

    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .in('trip_id', ids)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');

    const byTrip = {};
    (data || []).forEach(function (doc) {
      if (!byTrip[doc.trip_id]) byTrip[doc.trip_id] = [];
      byTrip[doc.trip_id].push(doc);
    });
    return byTrip;
  }


  async function outboundReviewQueue(status) {
    let query = client()
      .from('booking_documents')
      .select('*, trips(id, container, container_type, work_type, origin, destination, status, storage_zone_id, storage_teu, storage_released)')
      .not('trip_id', 'is', null);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('uploaded_at', { ascending: status === 'pending_review' });

    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Could not load outbound review queue');
    return data || [];
  }


  async function readyToProcessBookings() {
    const { data: bookings, error } = await client()
      .from('public_bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load bookings');

    const list = bookings || [];
    if (!list.length) return [];

    const docsByBooking = await documentsForBookings(list.map(function (b) { return b.id; }));

    return list
      .map(function (b) {
        const required = getRequiredDocTypes({ serviceType: b.service_type, origin: b.pickup_location, destination: b.dropoff_location });
        const docs = docsByBooking[b.id] || [];
        const verifiedTypes = {};
        docs.forEach(function (d) { if (d.status === 'verified') verifiedTypes[d.doc_type] = true; });
        const missing = required.filter(function (rt) { return !verifiedTypes[rt]; });
        return { booking: b, required: required, missing: missing, docs: docs };
      })
      .filter(function (entry) { return entry.required.length > 0 && entry.missing.length === 0; });
  }

 
  async function releaseStorageForTrip(tripId) {
    const { data: trip, error: tripErr } = await client()
      .from('trips')
      .select('id, booking_id, storage_zone_id, storage_teu, storage_released')
      .eq('id', tripId)
      .single();
    if (tripErr) throw new Error(tripErr.message || 'Trip not found');
    if (!trip.storage_zone_id || !trip.storage_teu) return { released: false, reason: 'no_allocation' };
    if (trip.storage_released) return { released: false, reason: 'already_released' };

    const { data: zone, error: zoneErr } = await client()
      .from('depot_storage_zones')
      .select('*')
      .eq('id', trip.storage_zone_id)
      .single();
    if (zoneErr) throw new Error(zoneErr.message || 'Storage zone not found');

    const newOccupied = Math.max(0, (zone.occupied_teu || 0) - trip.storage_teu);
    const { error: zoneUpdateErr } = await client()
      .from('depot_storage_zones')
      .update({ occupied_teu: newOccupied, updated_at: new Date().toISOString() })
      .eq('id', trip.storage_zone_id);
    if (zoneUpdateErr) throw new Error(zoneUpdateErr.message || 'Could not free storage space');

    // Best-effort: free whichever slot this container was sitting in, keyed
    // off the trip itself first (manually-added outbound containers) and
    // falling back to the originating booking (the common repatriation path).
    await releaseSlotByOccupant({ tripId }).catch(() => {});
    if (trip.booking_id) await releaseSlotByOccupant({ bookingId: trip.booking_id }).catch(() => {});

    const { error: tripUpdateErr } = await client()
      .from('trips')
      .update({ storage_released: true })
      .eq('id', tripId);
    if (tripUpdateErr) throw new Error(tripUpdateErr.message || 'Could not mark storage as released');

    return { released: true };
  }


  async function isStaffMember() {
    try {
      const { data: sessionData } = await client().auth.getSession();
      const userId = sessionData && sessionData.session ? sessionData.session.user.id : null;
      if (!userId) return false;

      const { data, error } = await client()
        .from('staff_members')
        .select('user_id')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } catch (e) {
      return false;
    }
  }


  async function getDownloadUrl(filePath, expiresInSeconds = 300) {
    const { data, error } = await client()
      .storage.from(BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);
    if (error) throw new Error(error.message || 'Could not generate download link');
    return data.signedUrl;
  }

  async function verifyDocument(documentId, notes) {
    const { data: sessionData } = await client().auth.getSession();
    const reviewerId = sessionData && sessionData.session ? sessionData.session.user.id : null;
    const { error } = await client()
      .from('booking_documents')
      .update({
        status: 'verified',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', documentId);
    if (error) throw new Error(error.message || 'Could not verify document');

  }

  async function rejectDocument(documentId, notes) {
    if (!notes) throw new Error('A reason is required when rejecting a document');
    const { data: sessionData } = await client().auth.getSession();
    const reviewerId = sessionData && sessionData.session ? sessionData.session.user.id : null;
    const { error } = await client()
      .from('booking_documents')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', documentId);
    if (error) throw new Error(error.message || 'Could not reject document');
  }


  // opts.blockId + opts.slotNumber are optional for back-compat with the old
  // zone-only/TEU-only callers (e.g. depOpsCreateManualOutbound doesn't deal
  // in blocks). When given, the specific slot is occupied and its condition
  // is set from the container's survey (falls back to 'full_grade').
  async function allocateStorage(bookingId, zoneId, teu, opts) {
    opts = opts || {};
    const { data: zone, error: zoneErr } = await client()
      .from('depot_storage_zones')
      .select('*')
      .eq('id', zoneId)
      .single();
    if (zoneErr) throw new Error(zoneErr.message || 'Zone not found');
    if (zone.capacity_teu - zone.occupied_teu < teu) {
      throw new Error(`Not enough space in ${zone.zone_name} — only ${zone.capacity_teu - zone.occupied_teu} TEU free`);
    }

    if (opts.blockId && opts.slotNumber) {
      await occupySlot({
        blockId: opts.blockId,
        slotNumber: opts.slotNumber,
        bookingId,
        container: opts.container || null,
        conditionStatus: opts.conditionStatus || 'full_grade',
      });
    }

    const { error: zoneUpdateErr } = await client()
      .from('depot_storage_zones')
      .update({ occupied_teu: zone.occupied_teu + teu, updated_at: new Date().toISOString() })
      .eq('id', zoneId);
    if (zoneUpdateErr) throw new Error(zoneUpdateErr.message || 'Could not reserve storage space');

    const bookingPatch = { storage_status: 'allocated', storage_zone_id: zoneId };
    if (opts.blockId) bookingPatch.storage_block_id = opts.blockId;
    if (opts.slotNumber) bookingPatch.storage_slot_number = opts.slotNumber;

    const { error: bookingUpdateErr } = await client()
      .from('public_bookings')
      .update(bookingPatch)
      .eq('id', bookingId);
    if (bookingUpdateErr) throw new Error(bookingUpdateErr.message || 'Could not update booking status');
  }

  // ── ZONES ──────────────────────────────────────────────────────────────
  // Zone → shipping line allocation ("Zone A is MSC's"). One zone belongs to
  // at most one shipping line; a null shipping_line_id means the zone is
  // unassigned/shared and shows up as an option for any line.
  async function listZones() {
    const { data, error } = await client()
      .from('depot_storage_zones')
      .select('*, shipping_lines(id, code, name)')
      .order('zone_code', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load zones');
    return data || [];
  }

  async function createZone({ zoneCode, zoneName, shippingLineId, capacityTeu, notes }) {
    if (!zoneCode || !zoneName) throw new Error('Zone code and name are required');
    const { data, error } = await client()
      .from('depot_storage_zones')
      .insert({
        zone_code: zoneCode.trim().toUpperCase(),
        zone_name: zoneName.trim(),
        shipping_line_id: shippingLineId || null,
        capacity_teu: Math.max(0, parseInt(capacityTeu, 10) || 0),
        occupied_teu: 0,
        notes: notes || null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Could not create zone — code may already be in use');
    return data;
  }

  async function updateZone(zoneId, patch) {
    if (!zoneId) throw new Error('zoneId is required');
    const { error } = await client()
      .from('depot_storage_zones')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', zoneId);
    if (error) throw new Error(error.message || 'Could not update zone');
  }

  // ── BLOCKS ─────────────────────────────────────────────────────────────
  // A block pins a sub-area of a zone to one container type/size, e.g.
  // "Zone A · Block 1 · 40ft" / "Zone A · Block 2 · 20ft" — copies the
  // block-level subdivision from the HTS system's Block/Bay/Position model.
  async function listBlocks(zoneId) {
    let query = client().from('depot_blocks').select('*').order('block_code', { ascending: true });
    if (zoneId) query = query.eq('zone_id', zoneId);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Could not load blocks');
    return data || [];
  }

  async function createBlock({ zoneId, blockCode, containerType, capacitySlots, notes }) {
    if (!zoneId) throw new Error('zoneId is required');
    if (!blockCode) throw new Error('Block code is required');
    const capacity = Math.max(1, parseInt(capacitySlots, 10) || 0);

    const { data: block, error } = await client()
      .from('depot_blocks')
      .insert({
        zone_id: zoneId,
        block_code: blockCode.trim().toUpperCase(),
        container_type: containerType || 'Any',
        capacity_slots: capacity,
        notes: notes || null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Could not create block — code may already exist in this zone');

    // Generate the block's slot grid up front (mirrors HTS: every position
    // exists as an empty row from the start, occupied in place rather than
    // created on demand).
    const slotRows = [];
    for (let i = 1; i <= capacity; i++) slotRows.push({ block_id: block.id, slot_number: i, condition_status: 'empty' });
    if (slotRows.length) {
      const { error: slotErr } = await client().from('depot_block_slots').insert(slotRows);
      if (slotErr) throw new Error(slotErr.message || 'Block created, but could not generate its slots');
    }
    return block;
  }

  async function updateBlock(blockId, patch) {
    if (!blockId) throw new Error('blockId is required');
    const { error } = await client()
      .from('depot_blocks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', blockId);
    if (error) throw new Error(error.message || 'Could not update block');
  }

  // ── SLOTS ──────────────────────────────────────────────────────────────
  async function blockSlots(blockId) {
    const { data, error } = await client()
      .from('depot_block_slots')
      .select('*')
      .eq('block_id', blockId)
      .order('slot_number', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load slots');
    return data || [];
  }

  // bookingId/tripId are both optional — a slot can be occupied purely by
  // container number for containers physically on-site with no matching
  // booking or trip (manual placement / stock-take), same spirit as
  // depOpsCreateManualOutbound's no-booking-required manual trips.
  async function occupySlot({ blockId, slotNumber, bookingId, tripId, container, conditionStatus }) {
    if (!blockId || !slotNumber) throw new Error('blockId and slotNumber are required');
    if (!bookingId && !tripId && !container) throw new Error('Provide a bookingId, tripId, or container number');

    const { data: existing, error: findErr } = await client()
      .from('depot_block_slots')
      .select('*')
      .eq('block_id', blockId)
      .eq('slot_number', slotNumber)
      .single();
    if (findErr) throw new Error(findErr.message || 'Slot not found');
    if (existing.booking_id || existing.trip_id || (existing.container && existing.condition_status !== 'empty')) {
      throw new Error(`Slot ${slotNumber} is already occupied`);
    }

    const { error } = await client()
      .from('depot_block_slots')
      .update({
        booking_id: bookingId || null,
        trip_id: tripId || null,
        container: container || null,
        condition_status: conditionStatus || 'full_grade',
        occupied_at: new Date().toISOString(),
        released_at: null,
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message || 'Could not occupy slot');
    return existing.id;
  }

  async function releaseSlotByOccupant({ bookingId, tripId }) {
    if (!bookingId && !tripId) throw new Error('bookingId or tripId is required');
    let query = client().from('depot_block_slots').update({
      booking_id: null, trip_id: null, container: null,
      condition_status: 'empty', released_at: new Date().toISOString(),
    });
    query = bookingId ? query.eq('booking_id', bookingId) : query.eq('trip_id', tripId);
    const { error } = await query;
    if (error) throw new Error(error.message || 'Could not release slot');
  }

  // For manually-placed containers with no booking/trip to key off — release
  // directly by block + slot number instead.
  async function releaseSlotByNumber(blockId, slotNumber) {
    if (!blockId || !slotNumber) throw new Error('blockId and slotNumber are required');
    const { error } = await client()
      .from('depot_block_slots')
      .update({ booking_id: null, trip_id: null, container: null, condition_status: 'empty', released_at: new Date().toISOString() })
      .eq('block_id', blockId)
      .eq('slot_number', slotNumber);
    if (error) throw new Error(error.message || 'Could not release slot');
  }

  async function slotForOccupant({ bookingId, tripId }) {
    if (!bookingId && !tripId) return null;
    let query = client().from('depot_block_slots').select('*, depot_blocks(id, block_code, zone_id, container_type)');
    query = bookingId ? query.eq('booking_id', bookingId) : query.eq('trip_id', tripId);
    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return data || null;
  }

  // ── SURVEY (Awaiting Survey → Surveyed gate) ─────────────────────────────
  // A container moves here right after being booked in, before it can be
  // allocated to a zone/block/slot. Mirrors the HTS survey form fields.
  async function recordSurvey(payload) {
    payload = payload || {};
    if (!payload.bookingId && !payload.tripId) throw new Error('bookingId or tripId is required');
    if (CONDITION_STATUSES.indexOf(payload.conditionStatus || 'full_grade') === -1) {
      throw new Error('condition_status must be one of: ' + CONDITION_STATUSES.join(', '));
    }

    const { data: sessionData } = await client().auth.getSession();
    const userId = sessionData && sessionData.session ? sessionData.session.user.id : null;

    const { data, error } = await client()
      .from('depot_surveys')
      .insert({
        booking_id: payload.bookingId || null,
        trip_id: payload.tripId || null,
        container: payload.container || null,
        container_type: payload.containerType || null,
        container_size: payload.containerSize || null,
        shipping_line_id: payload.shippingLineId || null,
        consignee: payload.consignee || null,
        bl_number: payload.blNumber || null,
        vessel: payload.vessel || null,
        voyage: payload.voyage || null,
        transporter: payload.transporter || null,
        truck_reg: payload.truckReg || null,
        driver_name: payload.driverName || null,
        clerk_name: payload.clerkName || null,
        seal_number: payload.sealNumber || null,
        gate_pass_number: payload.gatePassNumber || null,
        condition_status: payload.conditionStatus || 'full_grade',
        remarks: payload.remarks || null,
        photos: payload.photos || [],
        surveyed_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Could not save survey');

    // This is the gate: only a saved survey moves a booking out of
    // 'awaiting_survey' and into 'surveyed', which is what unlocks the
    // storage-allocation queue.
    if (payload.bookingId) {
      const { error: updErr } = await client()
        .from('public_bookings')
        .update({ storage_status: 'surveyed' })
        .eq('id', payload.bookingId);
      if (updErr) throw new Error(updErr.message || 'Survey saved, but could not update booking status');
    }
    return data;
  }

  async function surveyForOccupant({ bookingId, tripId }) {
    if (!bookingId && !tripId) return null;
    let query = client().from('depot_surveys').select('*').order('surveyed_at', { ascending: false }).limit(1);
    query = bookingId ? query.eq('booking_id', bookingId) : query.eq('trip_id', tripId);
    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return data || null;
  }

  async function awaitingSurveyBookings() {
    const { data, error } = await client()
      .from('public_bookings')
      .select('*')
      .eq('storage_status', 'awaiting_survey')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load awaiting-survey bookings');
    return data || [];
  }

  async function surveyedAwaitingAllocation() {
    const { data, error } = await client()
      .from('public_bookings')
      .select('*')
      .eq('storage_status', 'surveyed')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load surveyed bookings');
    return data || [];
  }

  window.bookingDocs = {
   
    uploadBookingDocument,
    uploadTripDocument,
    myBookingDocuments,
    storageAvailability,
   
    pendingReviewQueue,
    reviewQueue,
    outboundReviewQueue,
    readyToProcessBookings,
    documentsForBooking,
    documentsForBookings,
    documentsForTrip,
    documentsForTrips,
    isStaffMember,
    getDownloadUrl,
    verifyDocument,
    rejectDocument,
    allocateStorage,
    releaseStorageForTrip,
    getRequiredDocTypes,
    DOC_TYPES,
    OUTBOUND_REQUIRED_DOC_TYPES,
    PORT_LOCATIONS,

    // Zones / Blocks / Slots
    listZones,
    createZone,
    updateZone,
    listBlocks,
    createBlock,
    updateBlock,
    blockSlots,
    occupySlot,
    releaseSlotByOccupant,
    releaseSlotByNumber,
    slotForOccupant,

    // Survey
    recordSurvey,
    surveyForOccupant,
    awaitingSurveyBookings,
    surveyedAwaitingAllocation,
    CONDITION_STATUSES,
  };
})();