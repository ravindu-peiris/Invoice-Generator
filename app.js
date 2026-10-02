(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('voucherForm');
  const roomRows = $('roomRows');
  const roomTemplate = $('roomRowTemplate');
  const errorBox = $('formError');

  const state = {
    reference: '',
    issueDate: new Date(),
  };

  const mealSentenceMap = {
    'Half board (H/B)': 'half-board',
    'Full board (F/B)': 'full-board',
    'Bed & breakfast (B/B)': 'bed-and-breakfast',
    'Room only': 'room-only',
    'All inclusive (A/I)': 'all-inclusive',
  };

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  const countryCodes = {
    slovakia: 'SK',
    canada: 'CN',
    'sri lanka': 'LK',
    india: 'IN',
    china: 'CN',
    australia: 'AU',
    germany: 'DE',
    france: 'FR',
    italy: 'IT',
    spain: 'ES',
    netherlands: 'NL',
    belgium: 'BE',
    switzerland: 'CH',
    austria: 'AT',
    poland: 'PL',
    'czech republic': 'CZ',
    czechia: 'CZ',
    hungary: 'HU',
    romania: 'RO',
    bulgaria: 'BG',
    greece: 'GR',
    portugal: 'PT',
    sweden: 'SE',
    norway: 'NO',
    denmark: 'DK',
    finland: 'FI',
    ireland: 'IE',
    'united kingdom': 'GB',
    uk: 'GB',
    england: 'GB',
    scotland: 'GB',
    wales: 'GB',
    'united states': 'US',
    usa: 'US',
    'united states of america': 'US',
    japan: 'JP',
    'south korea': 'KR',
    korea: 'KR',
    thailand: 'TH',
    vietnam: 'VN',
    indonesia: 'ID',
    malaysia: 'MY',
    singapore: 'SG',
    philippines: 'PH',
    'new zealand': 'NZ',
    'south africa': 'ZA',
    brazil: 'BR',
    mexico: 'MX',
    argentina: 'AR',
    chile: 'CL',
    colombia: 'CO',
    peru: 'PE',
    russia: 'RU',
    ukraine: 'UA',
    turkey: 'TR',
    israel: 'IL',
    'saudi arabia': 'SA',
    'united arab emirates': 'AE',
    uae: 'AE',
    qatar: 'QA',
    kuwait: 'KW',
    bahrain: 'BH',
    oman: 'OM',
    egypt: 'EG',
    morocco: 'MA',
    kenya: 'KE',
    nigeria: 'NG',
    pakistan: 'PK',
    bangladesh: 'BD',
    nepal: 'NP',
    maldives: 'MV',
  };

  function normalizeCountryName(countryName) {
    return countryName.trim().toLowerCase().replace(/^the\s+/, '').replace(/\./g, '');
  }

  function getCountryCode(countryName) {
    const normalized = normalizeCountryName(countryName);
    if (!normalized) return 'XX';

    if (countryCodes[normalized]) return countryCodes[normalized];

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const first = words[0].replace(/[^a-z]/g, '');
      const second = words[1].replace(/[^a-z]/g, '');
      if (first && second) return `${first[0]}${second[0]}`.toUpperCase();
    }

    const letters = normalized.replace(/[^a-z]/g, '');
    return (letters.slice(0, 2) || 'XX').toUpperCase().padEnd(2, 'X');
  }

  function generateReferenceSuffix() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = new Uint32Array(4);
    crypto.getRandomValues(random);
    let suffix = '';
    for (let i = 0; i < 4; i++) suffix += alphabet[random[i] % alphabet.length];
    return suffix;
  }

  function buildReference(countryName, issueDate, suffix) {
    const countryCode = getCountryCode(countryName);
    const datePart = `${pad(issueDate.getMonth() + 1)}${pad(issueDate.getDate())}`;
    return `${countryCode}${datePart}-${suffix}`;
  }

  function generateReference(countryName = $('country').value) {
    return buildReference(countryName, state.issueDate || new Date(), generateReferenceSuffix());
  }

  function refreshReference() {
    const suffix = state.reference.split('-')[1] || generateReferenceSuffix();
    state.reference = buildReference($('country').value, state.issueDate, suffix);
    updateReferenceUi();
  }

  function formatLongDate(value) {
    const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  function formatIsoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function durationLabel(nights) {
    return `${nights} ${nights === 1 ? 'night' : 'nights'}`;
  }

  function calculateCheckOut() {
    const checkInValue = $('checkIn').value;
    const nights = Number($('duration').value || 0);
    if (!checkInValue || !nights) {
      $('checkOut').value = '';
      return null;
    }
    const date = new Date(`${checkInValue}T12:00:00`);
    date.setDate(date.getDate() + nights);
    $('checkOut').value = formatLongDate(date);
    return date;
  }

  function updateReferenceUi() {
    $('referenceDisplay').textContent = state.reference;
    $('issueDateDisplay').textContent = formatLongDate(state.issueDate);
    $('downloadRef').textContent = state.reference;
  }

  function populateDurationOptions() {
    const select = $('duration');
    for (let nights = 1; nights <= 30; nights++) {
      const option = document.createElement('option');
      option.value = String(nights);
      option.textContent = durationLabel(nights);
      select.appendChild(option);
    }
    select.value = '1';
  }

  function addRoomRow({ quantity = 1, type = 'Double room' } = {}) {
    if (roomRows.children.length >= 6) return;
    const fragment = roomTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.room-row');
    row.querySelector('.room-quantity').value = String(quantity);
    row.querySelector('.room-type').value = type;
    row.querySelector('.room-quantity').addEventListener('input', updateTotalRooms);
    row.querySelector('.room-type').addEventListener('change', clearError);
    row.querySelector('.remove-room-button').addEventListener('click', () => {
      row.remove();
      updateRoomRemoveButtons();
      updateTotalRooms();
    });
    roomRows.appendChild(fragment);
    updateRoomRemoveButtons();
    updateTotalRooms();
  }

  function updateRoomRemoveButtons() {
    const buttons = roomRows.querySelectorAll('.remove-room-button');
    buttons.forEach((button) => {
      button.disabled = buttons.length === 1;
    });
    $('addRoomBtn').disabled = roomRows.children.length >= 6;
  }

  function updateTotalRooms() {
    let total = 0;
    roomRows.querySelectorAll('.room-quantity').forEach((input) => {
      total += Math.max(0, Number(input.value || 0));
    });
    $('totalRooms').textContent = String(total);
  }

  function getRoomData() {
    return [...roomRows.querySelectorAll('.room-row')].map((row) => ({
      quantity: Number(row.querySelector('.room-quantity').value),
      type: row.querySelector('.room-type').value.trim(),
    }));
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function validateForm() {
    clearError();
    const required = [
      ['clientName', 'Client name'],
      ['country', 'Country'],
      ['hotel', 'Hotel'],
      ['checkIn', 'Check-in date'],
      ['mealBasis', 'Meal basis'],
      ['requestedBy', 'Requested by'],
    ];

    for (const [id, label] of required) {
      const el = $(id);
      if (!String(el.value || '').trim()) {
        el.focus();
        showError(`${label} is required.`);
        return false;
      }
    }

    const rooms = getRoomData();
    if (!rooms.length) {
      showError('Add at least one room type.');
      return false;
    }
    for (const room of rooms) {
      if (!Number.isFinite(room.quantity) || room.quantity < 1) {
        showError('Each room quantity must be at least 1.');
        return false;
      }
      if (!room.type) {
        showError('Select a room type for each row.');
        return false;
      }
    }
    return true;
  }

  function getFormData() {
    const checkOutDate = calculateCheckOut();
    const nights = Number($('duration').value);
    return {
      reference: state.reference,
      issueDate: formatLongDate(state.issueDate),
      clientName: $('clientName').value.trim(),
      country: $('country').value.trim(),
      hotel: $('hotel').value.trim(),
      checkIn: formatLongDate($('checkIn').value),
      checkOut: formatLongDate(checkOutDate),
      nights,
      duration: durationLabel(nights),
      mealBasis: $('mealBasis').value,
      mealSentence: mealSentenceMap[$('mealBasis').value] || $('mealBasis').value.toLowerCase(),
      requestedBy: $('requestedBy').value.trim(),
      rooms: getRoomData(),
    };
  }

  function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const words = text.split(/\s+/);
    let line = '';
    const lines = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
    return y + Math.min(lines.length, maxLines) * lineHeight;
  }

  function drawLabelValue(ctx, label, value, labelX, valueX, y, size = 22) {
    ctx.fillStyle = '#111111';
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.fillText(label, labelX, y);
    ctx.font = `400 ${size}px Arial, sans-serif`;
    ctx.fillText(`: ${value}`, valueX, y);
  }

  async function renderVoucherCanvas(data) {
    const width = 1240;
    const height = 1754;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'alphabetic';

    const logo = $('pdfLogo');
    if (logo.decode) {
      try { await logo.decode(); } catch (_) {}
    }
    const logoSize = 112;
    ctx.drawImage(logo, width / 2 - logoSize / 2, 64, logoSize, logoSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#050505';
    ctx.font = '800 39px Arial, sans-serif';
    ctx.fillText('CEYLONOVA GLOBAL TOURS', width / 2, 224);
    ctx.font = '400 21px Arial, sans-serif';
    ctx.fillText('91/E, 16th Lane, Isurupura, Malabe, Sri Lanka', width / 2, 269);
    ctx.fillText('Tel: +94 74 063 2719   |   ceylonovaglobaltours.com', width / 2, 299);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#c4544e';
    ctx.font = '800 42px Arial, sans-serif';
    ctx.fillText('Booking Voucher', 80, 385);

    drawLabelValue(ctx, 'Tour reference', data.reference, 80, 250, 441, 22);
    drawLabelValue(ctx, 'Client name', data.clientName, 80, 250, 489, 22);
    drawLabelValue(ctx, 'Country', data.country, 80, 250, 537, 22);

    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillText('Issue date', 810, 441);
    ctx.font = '400 22px Arial, sans-serif';
    ctx.fillText(`: ${data.issueDate}`, 940, 441);

    ctx.fillStyle = '#c4544e';
    ctx.font = '800 27px Arial, sans-serif';
    ctx.fillText('Reservation request', 80, 606);

    ctx.fillStyle = '#111111';
    ctx.font = '400 23px Arial, sans-serif';
    const sentence = `Please reserve the rooms listed below at ${data.hotel} for ${data.checkIn} to ${data.checkOut}, for ${data.duration} on a ${data.mealSentence} basis.`;
    const sentenceEnd = wrapText(ctx, sentence, 80, 654, 1080, 34, 3);

    const detailY = Math.max(764, sentenceEnd + 65);
    drawLabelValue(ctx, 'Hotel', data.hotel, 80, 190, detailY, 22);
    drawLabelValue(ctx, 'Check in', data.checkIn, 80, 190, detailY + 48, 22);
    drawLabelValue(ctx, 'Duration', data.duration, 80, 190, detailY + 96, 22);
    drawLabelValue(ctx, 'Check out', data.checkOut, 675, 820, detailY + 48, 22);
    drawLabelValue(ctx, 'Meal basis', data.mealBasis, 675, 820, detailY + 96, 22);

    const tableX = 80;
    const tableY = detailY + 140;
    const tableW = 1080;
    const headerH = 58;
    const rowH = 56;
    const col1 = 185;
    const col2 = 655;
    const col3 = tableW - col1 - col2;

    ctx.fillStyle = '#234352';
    ctx.fillRect(tableX, tableY, tableW, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 21px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Quantity', tableX + col1 / 2, tableY + 37);
    ctx.textAlign = 'left';
    ctx.fillText('Room type', tableX + col1 + 16, tableY + 37);
    ctx.textAlign = 'center';
    ctx.fillText('Nights', tableX + col1 + col2 + col3 / 2, tableY + 37);

    ctx.strokeStyle = '#d9e0e3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX + col1, tableY);
    ctx.lineTo(tableX + col1, tableY + headerH + data.rooms.length * rowH);
    ctx.moveTo(tableX + col1 + col2, tableY);
    ctx.lineTo(tableX + col1 + col2, tableY + headerH + data.rooms.length * rowH);
    ctx.stroke();

    data.rooms.forEach((room, index) => {
      const y = tableY + headerH + index * rowH;
      ctx.fillStyle = index % 2 === 0 ? '#f0f3f4' : '#ffffff';
      ctx.fillRect(tableX, y, tableW, rowH);
      ctx.strokeStyle = '#e2e7e9';
      ctx.strokeRect(tableX, y, tableW, rowH);
      ctx.fillStyle = '#111111';
      ctx.font = '400 21px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(room.quantity), tableX + col1 / 2, y + 36);
      ctx.textAlign = 'left';
      ctx.fillText(room.type, tableX + col1 + 16, y + 36);
      ctx.textAlign = 'center';
      ctx.fillText(String(data.nights), tableX + col1 + col2 + col3 / 2, y + 36);
    });

    const tableBottom = tableY + headerH + data.rooms.length * rowH;
    const totalRooms = data.rooms.reduce((sum, room) => sum + room.quantity, 0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111111';
    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillText(`Total rooms requested: ${totalRooms}`, 80, tableBottom + 48);

    let requestedY = tableBottom + 152;
    const footerReserve = 110;
    if (requestedY > height - 250) requestedY = height - 250;
    ctx.font = '800 26px Arial, sans-serif';
    ctx.fillText('Requested by', 80, requestedY);
    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillText(data.requestedBy, 80, requestedY + 50);
    ctx.fillText('Ceylonova Global Tours', 80, requestedY + 84);

    ctx.textAlign = 'center';
    ctx.font = '400 20px Arial, sans-serif';
    ctx.fillText('Thank you for your assistance with this reservation.', width / 2, height - footerReserve);

    return canvas;
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function concatBytes(parts) {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function encodeAscii(text) {
    return new TextEncoder().encode(text);
  }

  function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
    const pageW = 595.28;
    const pageH = 841.89;
    const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ`;
    const objects = [];

    objects[1] = encodeAscii('<< /Type /Catalog /Pages 2 0 R >>');
    objects[2] = encodeAscii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects[3] = encodeAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    objects[4] = concatBytes([
      encodeAscii(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
      jpegBytes,
      encodeAscii('\nendstream'),
    ]);
    objects[5] = encodeAscii(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    const chunks = [encodeAscii('%PDF-1.4\n%âãÏÓ\n')];
    const offsets = [0];
    let length = chunks[0].length;

    for (let i = 1; i <= 5; i++) {
      offsets[i] = length;
      const head = encodeAscii(`${i} 0 obj\n`);
      const tail = encodeAscii('\nendobj\n');
      chunks.push(head, objects[i], tail);
      length += head.length + objects[i].length + tail.length;
    }

    const xrefOffset = length;
    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(encodeAscii(xref));
    return concatBytes(chunks);
  }

  async function downloadVoucher(data) {
    const canvas = await renderVoucherCanvas(data);
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const jpegBytes = dataUrlToBytes(jpegDataUrl);
    const pdfBytes = buildPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.reference}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function resetVoucher() {
    form.reset();
    state.issueDate = new Date();
    state.reference = generateReference();
    roomRows.innerHTML = '';
    $('requestedBy').value = 'Manoj Peiris';
    $('duration').value = '1';
    $('mealBasis').value = 'Half board (H/B)';
    addRoomRow({ quantity: 1, type: 'Double room' });
    updateReferenceUi();
    calculateCheckOut();
    clearError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupMobileActionBar() {
    const actionBar = document.querySelector('.action-bar');
    const mobileQuery = window.matchMedia('(max-width: 760px)');
    let focusTimer = 0;

    const isFormField = (element) => (
      element instanceof HTMLInputElement
      && !['button', 'submit', 'reset', 'file'].includes(element.type)
    ) || element instanceof HTMLSelectElement
      || element instanceof HTMLTextAreaElement;

    const syncActionBar = () => {
      if (!actionBar || !mobileQuery.matches) {
        actionBar?.classList.remove('is-hidden');
        return;
      }
      const active = document.activeElement;
      actionBar.classList.toggle('is-hidden', form.contains(active) && isFormField(active));
    };

    form.addEventListener('focusin', (event) => {
      if (mobileQuery.matches && isFormField(event.target)) {
        actionBar?.classList.add('is-hidden');
      }
    });

    form.addEventListener('focusout', () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(syncActionBar, 100);
    });

    mobileQuery.addEventListener('change', syncActionBar);
  }

  populateDurationOptions();
  state.reference = generateReference();
  updateReferenceUi();
  addRoomRow({ quantity: 1, type: 'Double room' });
  setupMobileActionBar();

  $('checkIn').addEventListener('change', () => { calculateCheckOut(); clearError(); });
  $('duration').addEventListener('change', calculateCheckOut);
  $('country').addEventListener('input', refreshReference);
  $('addRoomBtn').addEventListener('click', () => addRoomRow());
  $('newVoucherBtn').addEventListener('click', resetVoucher);
  form.addEventListener('input', clearError);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const button = $('downloadBtn');
    const original = button.querySelector('span').textContent;
    try {
      button.disabled = true;
      button.querySelector('span').textContent = 'Preparing PDF...';
      const data = getFormData();
      await downloadVoucher(data);
      button.querySelector('span').textContent = 'Downloaded';
      setTimeout(() => { button.querySelector('span').textContent = original; }, 1200);
    } catch (error) {
      console.error(error);
      showError('Could not generate the PDF. Please try again.');
      button.querySelector('span').textContent = original;
    } finally {
      button.disabled = false;
    }
  });
})();
