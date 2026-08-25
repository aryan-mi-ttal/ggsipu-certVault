const crypto = require('crypto');

const DEFAULT_SALT = process.env.CERT_HASH_SALT || 'GGSIPU_SALT_2026_DSW_SECURE_HASH';

/**
 * Computes a standard SHA-256 hash of canonical certificate metadata:
 * (CERT_ID + ROLL_NO + NAME + EVENT + DATE + SALT)
 *
 * @param {Object} cert
 * @param {string} [cert.cert_id]
 * @param {string} [cert.CertID]
 * @param {string} [cert.roll_number]
 * @param {string} [cert.RollNumber]
 * @param {string} [cert.name]
 * @param {string} [cert.StudentName]
 * @param {string} [cert.event_name]
 * @param {string} [cert.EventName]
 * @param {string|Date} [cert.issue_date]
 * @param {string|Date} [cert.IssueDate]
 * @returns {string} SHA-256 Hex Digest (64 characters)
 */
function computeCertificateHash(cert) {
  if (!cert) return '';

  const cleanId = String(cert.cert_id || cert.CertID || '').trim();
  const cleanRollNo = String(cert.roll_number || cert.RollNumber || cert.RollNo || cert.roll_no || '').trim();
  const cleanName = String(cert.name || cert.StudentName || cert.Name || cert.student_name || '').trim().toUpperCase();
  const cleanEvent = String(cert.event_name || cert.EventName || cert.Event || cert.event || '').trim();

  let cleanDate = cert.issue_date || cert.IssueDate || cert.Date;
  if (cleanDate instanceof Date && !isNaN(cleanDate.getTime())) {
    const y = cleanDate.getFullYear();
    const m = String(cleanDate.getMonth() + 1).padStart(2, '0');
    const d = String(cleanDate.getDate()).padStart(2, '0');
    cleanDate = `${y}-${m}-${d}`;
  } else {
    const str = String(cleanDate || '').trim();
    if (str.includes('T')) {
      cleanDate = str.split('T')[0];
    } else {
      const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (ddmmyyyy) {
        const day = ddmmyyyy[1].padStart(2, '0');
        const month = ddmmyyyy[2].padStart(2, '0');
        const year = ddmmyyyy[3];
        cleanDate = `${year}-${month}-${day}`;
      } else {
        cleanDate = str;
      }
    }
  }

  // Canonical structured representation
  const canonicalString = [
    `CERT_ID:${cleanId}`,
    `ROLL_NO:${cleanRollNo}`,
    `NAME:${cleanName}`,
    `EVENT:${cleanEvent}`,
    `DATE:${cleanDate}`,
    `SALT:${DEFAULT_SALT}`,
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Checks if a certificate record matches its cryptographic hash.
 *
 * @param {Object} cert
 * @param {string} expectedHash
 * @returns {boolean}
 */
function verifyCertificateIntegrity(cert, expectedHash) {
  if (!expectedHash || !cert) return false;
  const computed = computeCertificateHash(cert);
  return computed.toLowerCase() === String(expectedHash).trim().toLowerCase();
}

/**
 * Computes a Merkle Root hash from an array of SHA-256 leaf hashes.
 *
 * @param {string[]} hashes
 * @returns {string} Merkle Root Hex string
 */
function computeMerkleRoot(hashes) {
  if (!hashes || hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  let currentLayer = hashes.slice();

  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        const combined = currentLayer[i] + currentLayer[i + 1];
        nextLayer.push(crypto.createHash('sha256').update(combined, 'utf8').digest('hex'));
      } else {
        const combinedOdd = currentLayer[i] + currentLayer[i];
        nextLayer.push(crypto.createHash('sha256').update(combinedOdd, 'utf8').digest('hex'));
      }
    }
    currentLayer = nextLayer;
  }

  return currentLayer[0];
}

module.exports = {
  computeCertificateHash,
  verifyCertificateIntegrity,
  computeMerkleRoot,
  DEFAULT_SALT,
};
