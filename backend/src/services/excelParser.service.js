const xlsx = require('xlsx');

// Canonical list of expected columns
const REQUIRED_COLUMNS = [
  'name',
  'email',
  'course',
  'event_name',
  'certificate_type',
  'issue_date',
  'roll_number',
];

// Essential columns that MUST be present in some form in the sheet
const ESSENTIAL_COLUMNS = ['name', 'email'];

function cleanHeaderKey(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Header alias mapping for flexibility and resilience
const HEADER_ALIASES = {
  name: [
    'name',
    'studentname',
    'student_name',
    'fullname',
    'full_name',
    'candidatename',
    'recipientname',
    'participantname',
    'student',
  ],
  email: [
    'email',
    'emailaddress',
    'email_address',
    'studentemail',
    'student_email',
    'mail',
    'emailid',
    'email_id',
  ],
  course: [
    'course',
    'branch',
    'program',
    'programme',
    'department',
    'dept',
    'school',
    'stream',
    'specialization',
  ],
  event_name: [
    'eventname',
    'event_name',
    'event',
    'eventtitle',
    'event_title',
    'workshopname',
    'hackathonname',
    'activity',
    'competition',
    'purpose',
  ],
  certificate_type: [
    'certificatetype',
    'certificate_type',
    'certtype',
    'cert_type',
    'type',
    'category',
    'awardtype',
    'status',
  ],
  issue_date: [
    'issuedate',
    'issue_date',
    'dateofissue',
    'date_of_issue',
    'date',
    'issuedon',
    'issued_on',
    'issuancedate',
  ],
  roll_number: [
    'rollnumber',
    'roll_number',
    'rollno',
    'roll_no',
    'enrollmentno',
    'enrollment_no',
    'enrollmentnumber',
    'regno',
    'reg_no',
    'registrationno',
    'certid',
    'cert_id',
    'id',
  ],
  cert_id: [
    'certid',
    'cert_id',
    'certificateid',
    'certificate_id',
  ],
};

/**
 * Sanitizes a cell string to prevent formula injection, XSS, and dangerous payloads.
 */
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';

  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }

  let str = String(val).trim();

  // Strip formula injection characters if at start of cell (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = str.replace(/^[=+\-@\t\r]+/, '').trim();
  }

  // Strip HTML script tags and dangerous event handlers
  str = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '');

  return str;
}

/**
 * Normalizes an Excel date value (Date object, Excel serial number, or string) to YYYY-MM-DD.
 */
function normalizeDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.toISOString().split('T')[0];
  }

  // If SheetJS parsed as Excel serial number (e.g. 46249.229)
  if (typeof rawDate === 'number') {
    try {
      const parsed = xlsx.SSF.parse_date_code(rawDate);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {}
  }

  const str = String(rawDate).trim();

  // Check if standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Try parsing with native Date
  const parsedNative = new Date(str);
  if (!isNaN(parsedNative.getTime())) {
    return parsedNative.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Matches a raw sheet header string to a canonical column name.
 */
function matchHeader(rawHeader) {
  if (!rawHeader) return null;
  const cleaned = cleanHeaderKey(rawHeader);

  // Exact cleaned match
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some(alias => cleanHeaderKey(alias) === cleaned)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Parses an in-memory Excel or CSV buffer and validates columns and rows.
 *
 * @param {Buffer} buffer - Excel/CSV file buffer
 * @returns {Object} Parse result with validRows and failedRows
 */
function parseExcelBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file buffer provided');
  }

  let workbook;
  try {
    workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
      raw: false,
    });
  } catch (err) {
    throw new Error(`Failed to parse spreadsheet file format: ${err.message}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      success: false,
      error: 'The uploaded spreadsheet contains no worksheets',
      totalRows: 0,
      validRows: [],
      failedRows: [],
    };
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet || !worksheet['!ref']) {
    return {
      success: false,
      error: `Worksheet "${sheetName}" is empty`,
      totalRows: 0,
      validRows: [],
      failedRows: [],
    };
  }

  // Convert worksheet to raw 2D array of rows
  const rawRows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawRows.length === 0) {
    return {
      success: false,
      error: 'The uploaded sheet contains no data',
      totalRows: 0,
      validRows: [],
      failedRows: [],
    };
  }

  // Find header row (first non-empty row containing recognized column names)
  let headerRowIndex = -1;
  let headerMap = {}; // canonicalName -> columnIndex

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (row && row.length > 0 && row.some(cell => String(cell).trim() !== '')) {
      const candidateMap = {};
      row.forEach((cell, colIdx) => {
        const canonical = matchHeader(cell);
        if (canonical && candidateMap[canonical] === undefined) {
          candidateMap[canonical] = colIdx;
        }
      });

      // If at least 'name' and 'email' (or 2+ recognizable columns) matched
      if (candidateMap['name'] !== undefined || candidateMap['email'] !== undefined || Object.keys(candidateMap).length >= 2) {
        headerRowIndex = i;
        headerMap = candidateMap;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      error: 'Could not identify a valid table header row in the sheet. Please include columns like StudentName, Email, Course, EventName, RollNumber.',
      totalRows: 0,
      validRows: [],
      failedRows: [],
    };
  }

  // Check for essential columns (name, email)
  const missingEssential = ESSENTIAL_COLUMNS.filter(col => headerMap[col] === undefined);
  if (missingEssential.length > 0) {
    return {
      success: false,
      error: `Missing required column(s): ${missingEssential.join(', ')}. Please ensure your spreadsheet has Student Name and Email columns.`,
      missingColumns: missingEssential,
      totalRows: 0,
      validRows: [],
      failedRows: [],
    };
  }

  const validRows = [];
  const failedRows = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let totalDataRows = 0;

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const rowNumber = i + 1; // 1-indexed for user readability

    // Skip entirely blank rows
    if (!rawRow || rawRow.every(c => String(c).trim() === '')) {
      continue;
    }

    totalDataRows++;

    const rawName = headerMap['name'] !== undefined ? rawRow[headerMap['name']] : '';
    const rawEmail = headerMap['email'] !== undefined ? rawRow[headerMap['email']] : '';
    const rawCourse = headerMap['course'] !== undefined ? rawRow[headerMap['course']] : '';
    const rawEvent = headerMap['event_name'] !== undefined ? rawRow[headerMap['event_name']] : '';
    const rawType = headerMap['certificate_type'] !== undefined ? rawRow[headerMap['certificate_type']] : '';
    const rawDate = headerMap['issue_date'] !== undefined ? rawRow[headerMap['issue_date']] : '';
    const rawRoll = headerMap['roll_number'] !== undefined ? rawRow[headerMap['roll_number']] : '';
    const rawCertId = headerMap['cert_id'] !== undefined ? rawRow[headerMap['cert_id']] : '';

    const name = sanitizeCellValue(rawName);
    const email = sanitizeCellValue(rawEmail).toLowerCase();
    const course = sanitizeCellValue(rawCourse) || 'GGSIPU';
    const event_name = sanitizeCellValue(rawEvent) || 'University Event';
    const certificate_type = sanitizeCellValue(rawType) || 'Participation';
    const roll_number = sanitizeCellValue(rawRoll) || sanitizeCellValue(rawCertId) || `ROLL-${totalDataRows}`;
    const issue_date = normalizeDate(rawDate);

    // Row-level validation checks
    const reasons = [];

    if (!name || name.length < 2) {
      reasons.push('Name is required (minimum 2 characters)');
    }
    if (!email || !emailRegex.test(email)) {
      reasons.push(`Invalid email format: "${email || 'empty'}"`);
    }

    if (reasons.length > 0) {
      failedRows.push({
        row: rowNumber,
        reason: reasons.join('; '),
        data: { name, email, roll_number, course, event_name },
      });
    } else {
      validRows.push({
        rowNumber,
        name,
        email,
        course,
        event_name,
        certificate_type,
        issue_date,
        roll_number,
        cert_id: sanitizeCellValue(rawCertId) || undefined,
      });
    }
  }

  return {
    success: true,
    totalRows: totalDataRows,
    validRows,
    failedRows,
    missingColumns: [],
  };
}

module.exports = {
  parseExcelBuffer,
  REQUIRED_COLUMNS,
  ESSENTIAL_COLUMNS,
  sanitizeCellValue,
  normalizeDate,
  matchHeader,
};
