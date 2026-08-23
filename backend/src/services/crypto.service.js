const crypto = require('crypto');

const DEFAULT_SALT = process.env.CERT_HASH_SALT || 'GGSIPU_SALT_2026_DSW_SECURE_HASH';

/**
 * Computes a standard SHA-256 hash of canonical certificate metadata:
 * (name + email + course + id + date)
 *
 * @param {Object} cert
 * @param {string} cert.name
 * @param {string} cert.email
 * @param {string} cert.course
 * @param {string} cert.cert_id
 * @param {string|Date} cert.issue_date
 * @param {string} [cert.roll_number]
 * @param {string} [cert.event_name]
 * @returns {string} SHA-256 Hex Digest (64 characters)
 */
function computeCertificateHash(cert) {
  const cleanName = String(cert.name || '').trim().toUpperCase();
  const cleanEmail = String(cert.email || '').trim().toLowerCase();
  const cleanCourse = String(cert.course || '').trim().toUpperCase();
  const cleanId = String(cert.cert_id || '').trim().toUpperCase();
  
  let cleanDate = cert.issue_date;
  if (cleanDate instanceof Date) {
    cleanDate = cleanDate.toISOString().split('T')[0];
  } else {
    cleanDate = String(cleanDate || '').trim();
  }

  // Canonical structured representation
  const canonicalString = [
    `NAME:${cleanName}`,
    `EMAIL:${cleanEmail}`,
    `COURSE:${cleanCourse}`,
    `ID:${cleanId}`,
    `DATE:${cleanDate}`,
    `SALT:${DEFAULT_SALT}`,
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
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
  computeMerkleRoot,
  DEFAULT_SALT,
};
