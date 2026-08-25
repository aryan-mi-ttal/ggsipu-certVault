const db = require('../db');
const { generateCertificateId } = require('./certId.service');
const { computeCertificateHash } = require('./crypto.service');

/**
 * Inserts a batch of validated certificate records into NeonDB inside a single database transaction.
 * If any database constraint or connection error occurs, the transaction rolls back completely.
 *
 * @param {Array<Object>} validRows - Validated row objects from excelParser
 * @returns {Promise<Array<string>>} Array of inserted unique certificate IDs
 */
async function insertCertificatesBatch(validRows) {
  if (!validRows || validRows.length === 0) {
    return [];
  }

  const client = await db.getClient();
  const existingSet = new Set();

  try {
    // 1. Begin transaction
    await client.query('BEGIN');

    const insertedCertIds = [];

    const insertQuery = `
      INSERT INTO certificates (
        cert_id,
        roll_number,
        name,
        email,
        course,
        event_name,
        cert_type,
        issue_date,
        hash,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
      RETURNING id, cert_id;
    `;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      // Generate or preserve unique Certificate ID
      let cert_id = row.cert_id && !existingSet.has(row.cert_id.toUpperCase())
        ? row.cert_id.toUpperCase()
        : generateCertificateId({
            course: row.course,
            eventName: row.event_name,
            sequence: i + 1,
            existingSet,
          });
      existingSet.add(cert_id);

      // Compute canonical SHA-256 hash of metadata
      const hash = computeCertificateHash({
        name: row.name,
        email: row.email,
        course: row.course,
        cert_id: cert_id,
        issue_date: row.issue_date,
        roll_number: row.roll_number,
        event_name: row.event_name,
      });

      const params = [
        cert_id,
        row.roll_number || '',
        row.name,
        row.email,
        row.course,
        row.event_name,
        row.certificate_type || 'Participation',
        row.issue_date,
        hash,
      ];

      const res = await client.query(insertQuery, params);
      insertedCertIds.push(res.rows[0].cert_id);
    }

    // 2. Commit transaction
    await client.query('COMMIT');
    console.log(`[CERT SERVICE] Batch transaction committed successfully. Inserted ${insertedCertIds.length} certificates.`);

    return insertedCertIds;
  } catch (error) {
    // 3. Rollback transaction on critical failure
    try {
      await client.query('ROLLBACK');
      console.warn('[CERT SERVICE] Transaction rolled back due to error:', error.message);
    } catch (rbError) {
      console.error('[CERT SERVICE] Rollback error:', rbError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves all certificates from NeonDB (e.g. for approvals / listing).
 */
async function getAllCertificates(options = {}) {
  const status = options.status;
  let query = 'SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash, status, pdf_url, pdf_file_id, created_at FROM certificates';
  const params = [];

  if (status) {
    query += ' WHERE LOWER(status) = $1';
    params.push(status.toLowerCase());
  }

  query += ' ORDER BY id DESC;';
  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Fetches certificate records matching an array of certIds, or all where pdf_url IS NULL.
 *
 * @param {Object} options
 * @param {string[]} [options.certIds] - Explicit list of certificate IDs
 * @param {boolean} [options.allNull] - Process all rows where pdf_url is NULL
 * @param {boolean} [options.processAllPending] - Process all pending rows
 * @returns {Promise<Array<Object>>}
 */
async function getCertificatesForPdfGeneration(options = {}) {
  const { certIds, processAllPending, allNull } = options;

  let query = `
    SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash, status, pdf_url, pdf_file_id
    FROM certificates
  `;
  const params = [];

  if (Array.isArray(certIds) && certIds.length > 0) {
    const placeholders = certIds.map((_, idx) => `$${idx + 1}`).join(', ');
    query += ` WHERE UPPER(TRIM(cert_id)) IN (${placeholders})`;
    params.push(...certIds.map(id => String(id).trim().toUpperCase()));
  } else if (allNull || processAllPending) {
    query += ` WHERE pdf_url IS NULL OR pdf_url = ''`;
  } else {
    // Default to all where pdf_url is null
    query += ` WHERE pdf_url IS NULL OR pdf_url = ''`;
  }

  query += ` ORDER BY id ASC;`;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Updates pdf_url and pdf_file_id for a given certificate.
 *
 * @param {string} certId
 * @param {string} pdfUrl
 * @param {string} pdfFileId
 * @returns {Promise<Object>}
 */
async function updateCertificatePdfUrl(certId, pdfUrl, pdfFileId) {
  const query = `
    UPDATE certificates
    SET pdf_url = $1, pdf_file_id = $2
    WHERE UPPER(TRIM(cert_id)) = UPPER(TRIM($3))
    RETURNING id, cert_id, name, pdf_url, pdf_file_id, status;
  `;
  const res = await db.query(query, [pdfUrl, pdfFileId || '', certId]);
  return res.rows[0];
}

/**
 * Updates certificate status (e.g. 'approved', 'revoked', 'pending').
 */
async function updateCertificateStatus(certId, status) {
  const query = `
    UPDATE certificates
    SET status = $1
    WHERE UPPER(TRIM(cert_id)) = UPPER(TRIM($2))
    RETURNING id, cert_id, name, status, pdf_url;
  `;
  const res = await db.query(query, [String(status).toLowerCase(), certId]);
  return res.rows[0];
}

/**
 * Approves a batch of certificates in NeonDB.
 */
async function approveCertificatesBatch(certIds) {
  if (!certIds || certIds.length === 0) return [];
  const placeholders = certIds.map((_, idx) => `$${idx + 1}`).join(', ');
  const query = `
    UPDATE certificates
    SET status = 'approved'
    WHERE UPPER(TRIM(cert_id)) IN (${placeholders})
    RETURNING id, cert_id, name, status, pdf_url;
  `;
  const res = await db.query(query, certIds.map(id => String(id).trim().toUpperCase()));
  return res.rows;
}

/**
 * Fetches approved certificates with valid PDF URLs ready for emailing.
 * Filtered by certIds if provided, otherwise all where emailed is not true.
 *
 * @param {Object} [options]
 * @param {string[]} [options.certIds]
 * @returns {Promise<Array<Object>>}
 */
async function getCertificatesForEmailing(options = {}) {
  const { certIds } = options;

  let query = `
    SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash, status, pdf_url, pdf_file_id, emailed, emailed_at
    FROM certificates
    WHERE pdf_url IS NOT NULL
      AND pdf_url != ''
  `;
  const params = [];

  if (Array.isArray(certIds) && certIds.length > 0) {
    const placeholders = certIds.map((_, idx) => `$${idx + 1}`).join(', ');
    query += ` AND UPPER(TRIM(cert_id)) IN (${placeholders})`;
    params.push(...certIds.map(id => String(id).trim().toUpperCase()));
  } else {
    query += ` AND LOWER(status) = 'approved' AND (emailed IS NULL OR emailed = FALSE)`;
  }

  query += ` ORDER BY id ASC;`;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Marks a certificate record as emailed in NeonDB with current timestamp.
 *
 * @param {string} certId
 * @returns {Promise<Object>}
 */
async function markCertificateEmailed(certId) {
  const query = `
    UPDATE certificates
    SET emailed = TRUE, emailed_at = NOW()
    WHERE UPPER(TRIM(cert_id)) = UPPER(TRIM($1))
    RETURNING id, cert_id, name, email, emailed, emailed_at;
  `;
  const res = await db.query(query, [certId]);
  return res.rows[0];
}

/**
 * Retrieves a single certificate by cert_id (case-insensitive).
 *
 * @param {string} certId
 * @returns {Promise<Object|null>}
 */
async function getCertificateByCertId(certId) {
  if (!certId) return null;
  const query = `
    SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash, status, pdf_url, pdf_file_id, created_at
    FROM certificates
    WHERE UPPER(TRIM(cert_id)) = UPPER(TRIM($1))
    LIMIT 1;
  `;
  const res = await db.query(query, [String(certId).trim()]);
  return res.rows[0] || null;
}

/**
 * Retrieves a certificate by its SHA-256 hash.
 *
 * @param {string} hash
 * @returns {Promise<Object|null>}
 */
async function getCertificateByHash(hash) {
  if (!hash) return null;
  const query = `
    SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash, status, pdf_url, pdf_file_id, created_at
    FROM certificates
    WHERE LOWER(TRIM(hash)) = LOWER(TRIM($1))
    LIMIT 1;
  `;
  const res = await db.query(query, [String(hash).trim()]);
  return res.rows[0] || null;
}

/**
 * Checks all existing certificates in database and updates any out-of-date or mismatched hashes.
 */
async function repairMismatchedCertificateHashes() {
  try {
    const res = await db.query('SELECT id, cert_id, roll_number, name, email, course, event_name, cert_type, issue_date, hash FROM certificates');
    let repairedCount = 0;
    for (const cert of res.rows) {
      const canonicalHash = computeCertificateHash(cert);
      if (String(cert.hash).toLowerCase() !== canonicalHash.toLowerCase()) {
        await db.query('UPDATE certificates SET hash = $1 WHERE id = $2', [canonicalHash, cert.id]);
        repairedCount++;
      }
    }
    if (repairedCount > 0) {
      console.log(`[CERT SERVICE] Repaired ${repairedCount} certificate hash(es) to canonical SHA-256 standard.`);
    }
    return repairedCount;
  } catch (err) {
    console.warn('[CERT SERVICE] Could not run hash repair:', err.message);
    return 0;
  }
}

module.exports = {
  insertCertificatesBatch,
  getAllCertificates,
  getCertificateByCertId,
  getCertificateByHash,
  getCertificatesForPdfGeneration,
  updateCertificatePdfUrl,
  updateCertificateStatus,
  approveCertificatesBatch,
  getCertificatesForEmailing,
  markCertificateEmailed,
  repairMismatchedCertificateHashes,
};
