// api/_dates.js
// Standardized South African (Africa/Johannesburg, UTC+2) date handling for Takealot.
// Guarantees:
// 1. NENHUMA DATA FIXA OU HARDCODED NO CÓDIGO.
// 2. Data da Compra (received_date): timestamp exato da compra (new Date().toISOString()).
// 3. Data Estimada de Entrega (delivery_date): estritamente 8 dias corridos após a compra (received_date + 8 * 86400000 ms).
// 4. Formatação de Datas:
//    - Fuso horário oficial: Africa/Johannesburg (UTC+2, sem horário de verão).
//    - Formato curto com dia da semana: "Tue, 10 Nov 2026"
//    - Formato em caixa alta para resumo do pedido: "2 NOV 2026" (fmtShortUpper)
//    - Formato longo por extenso para e-mails: "Tuesday, 10 November 2026"

'use strict';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Extracts calendar date (year, month 1-12, day 1-31) in Africa/Johannesburg (UTC+2).
 */
function getJohannesburgDateParts(d) {
  let dateObj = d instanceof Date ? d : (d ? new Date(d) : new Date());
  if (isNaN(dateObj.getTime())) dateObj = new Date();

  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour12: false,
    });
    const parts = dtf.formatToParts(dateObj);
    const p = {};
    for (let i = 0; i < parts.length; i++) {
      p[parts[i].type] = parts[i].value;
    }
    return {
      year: parseInt(p.year, 10),
      month: parseInt(p.month, 10),
      day: parseInt(p.day, 10),
    };
  } catch (_) {
    // SAST is UTC+2 with no daylight saving time
    const jhbDate = new Date(dateObj.getTime() + 2 * 3600 * 1000);
    return {
      year: jhbDate.getUTCFullYear(),
      month: jhbDate.getUTCMonth() + 1,
      day: jhbDate.getUTCDate(),
    };
  }
}

/**
 * Format a Date in Africa/Johannesburg timezone to short weekday format:
 * e.g. "Tue, 10 Nov 2026"
 */
function formatShort(dateObj) {
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return dtf.format(dateObj);
  } catch (_) {
    const parts = getJohannesburgDateParts(dateObj);
    const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    return `${DAYS_SHORT[anchor.getUTCDay()]}, ${anchor.getUTCDate()} ${MONTHS_SHORT[anchor.getUTCMonth()]} ${anchor.getUTCFullYear()}`;
  }
}

/**
 * Format a Date in Africa/Johannesburg timezone to uppercase order summary format:
 * e.g. "2 NOV 2026"
 */
function formatShortUpper(dateObj) {
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return dtf.format(dateObj).toUpperCase();
  } catch (_) {
    const parts = getJohannesburgDateParts(dateObj);
    const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    return `${anchor.getUTCDate()} ${MONTHS_SHORT[anchor.getUTCMonth()].toUpperCase()} ${anchor.getUTCFullYear()}`;
  }
}

/**
 * Format a Date in Africa/Johannesburg timezone to long full weekday format for emails:
 * e.g. "Tuesday, 10 November 2026"
 */
function formatLong(dateObj) {
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Johannesburg',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return dtf.format(dateObj);
  } catch (_) {
    const parts = getJohannesburgDateParts(dateObj);
    const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    return `${DAYS_LONG[anchor.getUTCDay()]}, ${anchor.getUTCDate()} ${MONTHS_LONG[anchor.getUTCMonth()]} ${anchor.getUTCFullYear()}`;
  }
}

/**
 * Computes deterministic order and delivery date representations in Africa/Johannesburg.
 * Formula: Estimated Delivery Date = Order Date + exactly 8 calendar days (8 * 86400000 ms).
 */
function computeOrderDates(orderDateInput, existingDeliveryDate) {
  let receivedDateObj = orderDateInput instanceof Date ? orderDateInput : (orderDateInput ? new Date(orderDateInput) : null);
  if (!receivedDateObj || isNaN(receivedDateObj.getTime())) {
    receivedDateObj = new Date();
  }
  const receivedIso = receivedDateObj.toISOString();

  let deliveryDateObj = existingDeliveryDate instanceof Date ? existingDeliveryDate : (existingDeliveryDate ? new Date(existingDeliveryDate) : null);
  if (!deliveryDateObj || isNaN(deliveryDateObj.getTime())) {
    // Strictly 8 calendar days after order date (8 * 86400000 ms)
    deliveryDateObj = new Date(receivedDateObj.getTime() + 8 * 86400000);
  }
  const deliveryIso = deliveryDateObj.toISOString();

  const orderDateShort = formatShort(receivedDateObj);
  const orderDateUpper = formatShortUpper(receivedDateObj);
  const deliveryDateShort = formatShort(deliveryDateObj);
  const deliveryDateLong = formatLong(deliveryDateObj);

  const delivParts = getJohannesburgDateParts(deliveryDateObj);
  const delivY = delivParts.year;
  const delivM = String(delivParts.month).padStart(2, '0');
  const delivD = String(delivParts.day).padStart(2, '0');
  const deliveryDateIso = `${delivY}-${delivM}-${delivD}`;

  return {
    received_date: receivedIso,
    delivery_date: deliveryIso,
    order_date_upper: orderDateUpper,
    order_date_formatted: orderDateShort,
    delivery_date_formatted: deliveryDateShort,
    delivery_date_long: deliveryDateLong,
    delivery_date_iso: deliveryDateIso,
  };
}

function getSADateIso(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function calculateSADaysElapsed(receivedDateInput, nowInput = new Date()) {
  const pIso = getSADateIso(receivedDateInput);
  const nowIso = getSADateIso(nowInput);
  if (!pIso || !nowIso) return 0;
  const [py, pm, pd] = pIso.split('-').map(Number);
  const [ny, nm, nd] = nowIso.split('-').map(Number);
  const diff = Math.floor((Date.UTC(ny, nm - 1, nd) - Date.UTC(py, pm - 1, pd)) / 86400000);
  return diff < 0 ? 0 : diff;
}

module.exports = {
  getJohannesburgDateParts,
  formatShort,
  formatShortUpper,
  formatLong,
  computeOrderDates,
  getSADateIso,
  calculateSADaysElapsed,
};
