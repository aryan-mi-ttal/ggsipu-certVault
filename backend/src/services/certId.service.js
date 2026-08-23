const crypto = require('crypto');

/**
 * Extracts a normalized 3-5 character department code from course/school/event.
 * Defaults to 'DSW' if no specific department match is found.
 */
function extractDeptCode(course = '', school = '', eventName = '') {
  const combined = `${course} ${school} ${eventName}`.toUpperCase();

  if (combined.includes('USICT') || combined.includes('CSE') || combined.includes('COMPUTER') || combined.includes('IT')) {
    return 'USICT';
  }
  if (combined.includes('USMS') || combined.includes('MBA') || combined.includes('BBA') || combined.includes('MANAGEMENT')) {
    return 'USMS';
  }
  if (combined.includes('USLLS') || combined.includes('LLB') || combined.includes('LAW')) {
    return 'USLLS';
  }
  if (combined.includes('USCT') || combined.includes('CHEMICAL')) {
    return 'USCT';
  }
  if (combined.includes('USBAS') || combined.includes('PHYSICS') || combined.includes('CHEMISTRY') || combined.includes('MATH')) {
    return 'USBAS';
  }
  if (combined.includes('USMC') || combined.includes('JOURNALISM') || combined.includes('MEDIA')) {
    return 'USMC';
  }
  if (combined.includes('USHSS') || combined.includes('HUMANITIES')) {
    return 'USHSS';
  }
  if (combined.includes('USAP') || combined.includes('ARCHITECTURE')) {
    return 'USAP';
  }
  if (combined.includes('USBT') || combined.includes('BIOTECH')) {
    return 'USBT';
  }
  if (combined.includes('USEM') || combined.includes('ENVIRONMENT')) {
    return 'USEM';
  }
  if (combined.includes('USE') || combined.includes('EDUCATION')) {
    return 'USE';
  }
  if (combined.includes('USMP') || combined.includes('PHARMACEUTICAL') || combined.includes('MEDICINE')) {
    return 'USMP';
  }

  return 'DSW';
}

/**
 * Generates a unique, standardized certificate ID following the format:
 * GGSIPU-{year}-{dept}-{sequence}
 *
 * @param {Object} options
 * @param {string} [options.course]
 * @param {string} [options.school]
 * @param {string} [options.eventName]
 * @param {number|string} [options.sequence]
 * @param {number} [options.year]
 * @param {Set<string>} [options.existingSet]
 * @returns {string} Unique Certificate ID
 */
function generateCertificateId(options = {}) {
  const year = options.year || new Date().getFullYear();
  const dept = extractDeptCode(options.course, options.school, options.eventName);
  const existingSet = options.existingSet || new Set();

  // If a sequence number was passed (e.g. 1, 2, 3), pad with 4 digits + short hex salt for uniqueness
  if (options.sequence !== undefined && options.sequence !== null) {
    const paddedSeq = String(options.sequence).padStart(4, '0');
    const randomSalt = crypto.randomBytes(2).toString('hex').toUpperCase();
    const candidate = `GGSIPU-${year}-${dept}-${paddedSeq}-${randomSalt}`;
    
    if (!existingSet.has(candidate)) {
      existingSet.add(candidate);
      return candidate;
    }
  }

  // Fallback / standard collision-resistant generation
  for (let attempt = 0; attempt < 100; attempt++) {
    const timestampChunk = Date.now().toString(36).toUpperCase().slice(-4);
    const randChunk = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `GGSIPU-${year}-${dept}-${timestampChunk}${randChunk}`;

    if (!existingSet.has(candidate)) {
      existingSet.add(candidate);
      return candidate;
    }
  }

  const fallback = `GGSIPU-${year}-${dept}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  existingSet.add(fallback);
  return fallback;
}

module.exports = {
  generateCertificateId,
  extractDeptCode,
};
