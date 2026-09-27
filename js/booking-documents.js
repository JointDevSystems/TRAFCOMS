(function () {
  'use strict';

  const BUCKET = 'booking-documents';
  const DOC_TYPES = ['guarantee_form', 'release_order', 'delivery_order'];


  const OUTWARD_REQUIRED_DOC_TYPES = ['release_order'];


  const PORT_LOCATIONS = ['Mombasa Port (KPA)', 'APM Terminals', 'APM Terminals Mombasa'];



  const CONDITION_STATUSES = ['full_grade', 'under_repair', 'damaged', 'heavily_damaged'];

  function kmaMaxStackHeight(containerType) {
    return /reefer/i.test(containerType || '') ? 6 : 7;
  }

  const FALLBACK_TARIFF_SCHEDULE = {
    'Structural': [
      { code: 'STR-01', side: 'Side Wall',  item: 'Panel replacement (per panel)', hours: 4,   material: 8500 },
      { code: 'STR-02', side: 'Roof',       item: 'Roof panel patch',              hours: 3,   material: 6000 },
      { code: 'STR-03', side: 'Floor',      item: 'Floor board replacement (per board)', hours: 2.5, material: 4500 },
      { code: 'STR-04', side: 'Corner Post', item: 'Corner post straighten/weld',   hours: 5,   material: 5000 },
    ],
    'Doors & Seals': [
      { code: 'DOR-01', side: 'Rear Doors', item: 'Door gasket replacement',       hours: 1.5, material: 2200 },
      { code: 'DOR-02', side: 'Rear Doors', item: 'Locking bar / cam repair',      hours: 1,   material: 1800 },
      { code: 'DOR-03', side: 'Rear Doors', item: 'Hinge replacement',             hours: 2,   material: 3200 },
    ],
    'Cleaning': [
      { code: 'CLN-01', side: 'Interior',   item: 'Standard sweep & wash',         hours: 0.5, material: 500 },
      { code: 'CLN-02', side: 'Interior',   item: 'Chemical / residue wash',       hours: 1.5, material: 2500 },
    ],
  };

  const TARIFF_SCHEDULE = (typeof window !== 'undefined' && window.GHD_TARIFF_SCHEDULE)
    ? window.GHD_TARIFF_SCHEDULE
    : FALLBACK_TARIFF_SCHEDULE;


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



  async function _uploadDocument({ bookingId, tripId, interchangeId, docType, containerNo, file, autoVerify }) {
    const parentCount = [bookingId, tripId, interchangeId].filter(Boolean).length;
    if (parentCount === 0) throw new Error('bookingId, tripId or interchangeId is required');
    if (parentCount > 1) throw new Error('Provide exactly one of bookingId, tripId or interchangeId');
    if (!file) throw new Error('No file selected');
    assertDocType(docType);

    const { data: sessionData } = await client().auth.getSession();
    const userId = sessionData && sessionData.session ? sessionData.session.user.id : null;
    if (!userId) throw new Error('Please sign in before uploading documents.');

    const parentId = bookingId || tripId || interchangeId;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${parentId}/${docType}-${Date.now()}-${safeName}`;

    const { error: uploadErr } = await client()
      .storage.from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadErr) throw new Error(uploadErr.message || 'Upload failed — please try again');

    // autoVerify is for documents captured by depot staff at the point of
    // physical handling (e.g. a guarantee form scanned in at gate entry, or
    // a release order scanned in at dispatch) — those never need to sit in
    // the DepOps review queue since someone already checked the physical
    // copy when they recorded the movement. Documents coming in through the
    // public booking portal always go through the normal pending_review
    // queue since nobody at the depot has laid eyes on them yet.
    const insertPayload = {
      booking_id: bookingId || null,
      trip_id: tripId || null,
      interchange_id: interchangeId || null,
      doc_type: docType,
      container_no: containerNo || null,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size_bytes: file.size || null,
      uploaded_by: userId,
    };
    if (autoVerify) {
      insertPayload.status = 'verified';
      insertPayload.reviewed_by = userId;
      insertPayload.reviewed_at = new Date().toISOString();
      insertPayload.review_notes = 'Verified at point of entry — recorded by depot staff.';
    }

    const { data: row, error: insertErr } = await client()
      .from('booking_documents')
      .insert(insertPayload)
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


  async function uploadTripDocument({ tripId, docType, containerNo, file, autoVerify }) {
    if (!tripId) throw new Error('tripId is required');
    return _uploadDocument({ tripId, docType, containerNo, file, autoVerify });
  }


  async function uploadInterchangeDocument({ interchangeId, docType, containerNo, file, autoVerify }) {
    if (!interchangeId) throw new Error('interchangeId is required');
    return _uploadDocument({ interchangeId, docType, containerNo, file, autoVerify });
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


  async function documentsForInterchange(interchangeId) {
    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .eq('interchange_id', interchangeId)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');
    return data || [];
  }

  async function documentsForInterchanges(interchangeIds) {
    const ids = (interchangeIds || []).filter(Boolean);
    if (!ids.length) return {};

    const { data, error } = await client()
      .from('booking_documents')
      .select('*')
      .in('interchange_id', ids)
      .order('uploaded_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load documents');

    const byInterchange = {};
    (data || []).forEach(function (doc) {
      if (!byInterchange[doc.interchange_id]) byInterchange[doc.interchange_id] = [];
      byInterchange[doc.interchange_id].push(doc);
    });
    return byInterchange;
  }


  async function outwardReviewQueue(status) {
    let query = client()
      .from('booking_documents')
      .select('*, trips(id, container, container_type, work_type, origin, destination, status, storage_zone_id, storage_teu, storage_released)')
      .not('trip_id', 'is', null);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('uploaded_at', { ascending: status === 'pending_review' });

    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Could not load outward review queue');
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


  async function recordSurvey(payload) {
    payload = payload || {};
    if (!payload.bookingId && !payload.tripId) throw new Error('bookingId or tripId is required');
    if (CONDITION_STATUSES.indexOf(payload.conditionStatus || 'full_grade') === -1) {
      throw new Error('condition_status must be one of: ' + CONDITION_STATUSES.join(', '));
    }

    const { data: sessionData } = await client().auth.getSession();
    const userId = sessionData && sessionData.session ? sessionData.session.user.id : null;

    const isHeavilyDamaged = (payload.conditionStatus === 'heavily_damaged');

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
        eir_number: payload.eirNumber || null,
        iso_code: payload.isoCode || null,
        mgwt: payload.mgwt || null,
        tare_weight: payload.tareWeight || null,
        vessel: payload.vessel || null,
        voyage: payload.voyage || null,
        source_interchange_id: payload.sourceInterchangeId || null,
        transporter: payload.transporter || null,
        truck_reg: payload.truckReg || null,
        trailer_number: payload.trailerNumber || null,
        driver_name: payload.driverName || null,
        driver_id_number: payload.driverIdNumber || null,
        clerk_name: payload.clerkName || null,
        seal_number: payload.sealNumber || null,
        gate_pass_number: payload.gatePassNumber || null,
        condition_status: payload.conditionStatus || 'full_grade',
        remarks: payload.remarks || null,
        photos: payload.photos || [],

        tariff_items: (payload.tariffItems && payload.tariffItems.length) ? payload.tariffItems : null,
        tariff_category: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].category) || null,
        tariff_code: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].code) || null,
        tariff_side: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].side) || null,
        tariff_item: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].item) || null,
        tariff_hours: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].hours) || null,
        tariff_material: (payload.tariffItems && payload.tariffItems[0] && payload.tariffItems[0].material) || null,
        escalated: isHeavilyDamaged,
        surveyed_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Could not save survey');


    if (payload.bookingId) {
      const { error: updErr } = await client()
        .from('public_bookings')
        .update({ storage_status: isHeavilyDamaged ? 'escalated' : 'surveyed' })
        .eq('id', payload.bookingId);
      if (updErr) throw new Error(updErr.message || 'Survey saved, but could not update booking status');
    }
    return data;
  }


  async function surveyById(surveyId) {
    if (!surveyId) return null;
    const { data, error } = await client().from('depot_surveys').select('*').eq('id', surveyId).maybeSingle();
    if (error) return null;
    return data || null;
  }


  async function escalatedBookings() {
    const { data: bookings, error } = await client()
      .from('public_bookings')
      .select('*')
      .eq('storage_status', 'escalated')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load escalated bookings');
    const list = bookings || [];
    if (!list.length) return [];

    const ids = list.map(function (b) { return b.id; });
    const { data: surveys, error: surveyErr } = await client()
      .from('depot_surveys')
      .select('*')
      .in('booking_id', ids)
      .eq('escalated', true)
      .order('surveyed_at', { ascending: false });
    if (surveyErr) throw new Error(surveyErr.message || 'Could not load surveys for escalated bookings');

    const surveyByBooking = {};
    (surveys || []).forEach(function (s) {
      // newest-first, so the first one seen per booking is the current
      // outstanding escalation
      if (!surveyByBooking[s.booking_id]) surveyByBooking[s.booking_id] = s;
    });

    return list.map(function (b) {
      const survey = surveyByBooking[b.id] || null;
      return { ...b, survey: survey, surveyId: survey ? survey.id : null };
    });
  }


  async function escalatedSurveys() {
    const { data: surveys, error } = await client()
      .from('depot_surveys')
      .select('*')
      .eq('escalated', true)
      .order('surveyed_at', { ascending: true });
    if (error) throw new Error(error.message || 'Could not load escalated surveys');
    const list = surveys || [];
    if (!list.length) return [];

    const bookingIds = list.map(function (s) { return s.booking_id; }).filter(Boolean);
    const tripIds = list.map(function (s) { return s.trip_id; }).filter(Boolean);

    const [bookingsRes, tripsRes] = await Promise.all([
      bookingIds.length
        ? client().from('public_bookings').select('*').in('id', bookingIds)
        : Promise.resolve({ data: [] }),
      tripIds.length
        ? client().from('trips').select('*').in('id', tripIds)
        : Promise.resolve({ data: [] }),
    ]);
    const bookingById = {};
    (bookingsRes.data || []).forEach(function (b) { bookingById[b.id] = b; });
    const tripById = {};
    (tripsRes.data || []).forEach(function (t) { tripById[t.id] = t; });

    return list.map(function (s) {
      return {
        surveyId: s.id,
        survey: s,
        bookingId: s.booking_id || null,
        tripId: s.trip_id || null,
        booking: s.booking_id ? (bookingById[s.booking_id] || null) : null,
        trip: s.trip_id ? (tripById[s.trip_id] || null) : null,
        container: s.container || (s.booking_id && bookingById[s.booking_id] && bookingById[s.booking_id].container) || (s.trip_id && tripById[s.trip_id] && tripById[s.trip_id].container) || null,
      };
    });
  }


  async function recordJointSurvey({ bookingId, tripId, surveyId, jointSurveyBy, jointSurveyNotes, finalConditionStatus, reject }) {
    if (!bookingId && !tripId) throw new Error('bookingId or tripId is required');
    if (!jointSurveyBy) throw new Error('Joint surveyor name is required');
    if (!surveyId) throw new Error('surveyId is required — could not find the original survey. Use escalatedSurveys() (or escalatedBookings() for booking-only cases) to fetch escalations, which return each one\'s survey/surveyId already joined.');
    if (finalConditionStatus && CONDITION_STATUSES.indexOf(finalConditionStatus) === -1) {
      throw new Error('finalConditionStatus must be one of: ' + CONDITION_STATUSES.join(', '));
    }

    const { error: surveyErr } = await client()
      .from('depot_surveys')
      .update({
        escalated: false,
        joint_survey_by: jointSurveyBy,
        joint_survey_notes: jointSurveyNotes || null,
        joint_survey_at: new Date().toISOString(),
        condition_status: finalConditionStatus || 'damaged',
      })
      .eq('id', surveyId);
    if (surveyErr) throw new Error(surveyErr.message || 'Could not record joint survey');

    if (bookingId) {
      const { error: bookingErr } = await client()
        .from('public_bookings')
        .update({ storage_status: reject ? 'survey_rejected' : 'surveyed' })
        .eq('id', bookingId);
      if (bookingErr) throw new Error(bookingErr.message || 'Joint survey saved, but could not update booking status');
    }

  }


  async function listAllSurveys() {
    const { data, error } = await client()
      .from('depot_surveys')
      .select('*, public_bookings(full_name, company, container, storage_status)')
      .order('surveyed_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load surveys');
    return data || [];
  }


  async function markInterchangeGenerated(surveyId, interchangeId) {
    if (!surveyId) throw new Error('surveyId is required');
    const { error } = await client()
      .from('depot_surveys')
      .update({ interchange_id: interchangeId || null, interchange_generated_at: new Date().toISOString() })
      .eq('id', surveyId);
    if (error) throw new Error(error.message || 'Could not flag interchange as generated');
  }


  async function masterContainerList() {
    const { data: bookings, error } = await client()
      .from('public_bookings')
      .select('*')
      .eq('service_type', 'Depot Storage')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load bookings');
    const ids = (bookings || []).map(b => b.id);
    if (!ids.length) return [];

    const [{ data: surveys }, { data: slots }] = await Promise.all([
      client().from('depot_surveys').select('*').in('booking_id', ids).order('surveyed_at', { ascending: false }),
      client().from('depot_block_slots').select('*, depot_blocks(block_code, zone_id)').in('booking_id', ids),
    ]);
    const surveyByBooking = {};
    (surveys || []).forEach(s => { if (!surveyByBooking[s.booking_id]) surveyByBooking[s.booking_id] = s; });
    const slotByBooking = {};
    (slots || []).forEach(s => { slotByBooking[s.booking_id] = s; });

    return (bookings || []).map(b => ({
      booking: b,
      survey: surveyByBooking[b.id] || null,
      slot: slotByBooking[b.id] || null,
    }));
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
    uploadInterchangeDocument,
    myBookingDocuments,
    storageAvailability,
   
    pendingReviewQueue,
    reviewQueue,
    outwardReviewQueue,
    readyToProcessBookings,
    documentsForBooking,
    documentsForBookings,
    documentsForTrip,
    documentsForTrips,
    documentsForInterchange,
    documentsForInterchanges,
    isStaffMember,
    getDownloadUrl,
    verifyDocument,
    rejectDocument,
    allocateStorage,
    releaseStorageForTrip,
    getRequiredDocTypes,
    DOC_TYPES,
    OUTWARD_REQUIRED_DOC_TYPES,
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
    surveyById,
    awaitingSurveyBookings,
    surveyedAwaitingAllocation,
    CONDITION_STATUSES,
    TARIFF_SCHEDULE,
    kmaMaxStackHeight,

    // Escalation / joint survey
    escalatedBookings,
    escalatedSurveys,
    recordJointSurvey,

    // Register / master list / interchange linkage
    listAllSurveys,
    markInterchangeGenerated,
    masterContainerList,
  };
})();