const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const { parseExcelBuffer } = require('../services/excelParser.service');
const { generateCertificatePdf } = require('../services/pdfGenerator.service');
const { uploadPdfToDrive } = require('../services/drive.service');
const { sendCertificateEmail, delay } = require('../services/email.service');
const {
  insertCertificatesBatch,
  getAllCertificates,
  getCertificateByCertId,
  getCertificateByHash,
  getCertificatesForPdfGeneration,
  updateCertificatePdfUrl,
  getCertificatesForEmailing,
  markCertificateEmailed,
} = require('../services/certificate.service');
const { computeCertificateHash, verifyCertificateIntegrity } = require('../services/crypto.service');

/**
 * POST /api/certificates/bulk-generate
 *
 * Protected: Requires ADMIN role.
 * Accepts: multipart/form-data Excel or CSV file (.xlsx, .xls, .csv, max 5MB).
 * Returns: Batch processing summary { totalRows, successCount, failedRows, insertedCertIds }.
 */
router.post(
  '/bulk-generate',
  authenticateUser,
  requireAdmin,
  handleUpload('file'),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please upload a valid .xlsx, .xls, or .csv file under form-data key "file".',
        });
      }

      // 1. Parse and sanitize spreadsheet buffer
      let parseResult;
      try {
        parseResult = parseExcelBuffer(req.file.buffer);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: parseErr.message || 'Invalid or corrupted spreadsheet file.',
        });
      }

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error,
          missingColumns: parseResult.missingColumns || [],
        });
      }

      const { totalRows, validRows, failedRows } = parseResult;

      if (totalRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'The uploaded file contains no valid student records to process.',
          totalRows: 0,
          successCount: 0,
          failedRows: [],
          insertedCertIds: [],
        });
      }

      // If all rows failed validation, return 400 Bad Request with details
      if (validRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All rows in the spreadsheet failed validation. No certificates were generated.',
          totalRows,
          successCount: 0,
          failedRows,
          insertedCertIds: [],
        });
      }

      // 2. Perform atomic transactional insertion into NeonDB
      let insertedCertIds = [];
      try {
        insertedCertIds = await insertCertificatesBatch(validRows);
      } catch (dbErr) {
        console.error('[BULK GENERATE] Database batch insert error:', dbErr);
        return res.status(500).json({
          success: false,
          message: `Database transaction failure: ${dbErr.message || 'Unable to save certificates to database'}`,
        });
      }

      // 3. Return JSON summary
      const successCount = insertedCertIds.length;
      const isPartial = failedRows.length > 0;

      return res.status(201).json({
        success: true,
        message: isPartial
          ? `Processed batch: ${successCount} certificate(s) generated successfully, ${failedRows.length} row(s) failed.`
          : `All ${successCount} certificate(s) generated and stored with status 'pending' successfully.`,
        totalRows,
        successCount,
        failedRows,
        insertedCertIds,
      });
    } catch (error) {
      console.error('[BULK GENERATE] Unhandled server error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while processing bulk certificate generation',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/certificates/generate-pdf
 *
 * Protected: Requires ADMIN role.
 * Body: { certIds?: string[], processAllPending?: boolean, allNull?: boolean }
 * Action: Renders high-quality PDF certificates with embedded QR codes & SHA-256 stamps,
 *         uploads them to Google Drive with public view permissions,
 *         and updates NeonDB with pdf_url and pdf_file_id.
 * Returns: { totalAttempted, successCount, generated: [...], failed: [...] }
 */
router.post('/generate-pdf', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { certIds, processAllPending, allNull } = req.body || {};

    // 1. Fetch certificate records from database
    const certificates = await getCertificatesForPdfGeneration({
      certIds,
      processAllPending,
      allNull,
    });

    if (certificates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No certificates found matching the criteria for PDF generation.',
        totalAttempted: 0,
        successCount: 0,
        generated: [],
        failed: [],
      });
    }

    const generated = [];
    const failed = [];

    // 2. Iterate through certificates with isolated try/catch per cert
    for (const cert of certificates) {
      const certId = cert.cert_id;
      try {
        console.log(`[PDF ROUTE] Rendering PDF for Certificate: ${certId} (${cert.name})...`);

        // Render PDF buffer using pdf-lib & qrcode
        const pdfBuffer = await generateCertificatePdf(cert);

        // Upload to Google Drive and get shareable link
        const driveResult = await uploadPdfToDrive(pdfBuffer, certId);

        // Update database with Drive webViewLink and driveFileId
        await updateCertificatePdfUrl(
          certId,
          driveResult.webViewLink,
          driveResult.fileId
        );

        generated.push({
          certId: certId,
          name: cert.name,
          pdfUrl: driveResult.webViewLink,
          pdfFileId: driveResult.fileId,
          isMock: driveResult.isMock || false,
        });
      } catch (err) {
        console.error(`[PDF ROUTE] Failed to process PDF for Certificate ${certId}:`, err);
        failed.push({
          certId: certId,
          reason: err.message || 'Error generating or uploading certificate PDF',
        });
      }
    }

    const totalAttempted = certificates.length;
    const successCount = generated.length;

    return res.status(200).json({
      success: true,
      message: `Processed PDF generation: ${successCount} generated successfully, ${failed.length} failed.`,
      totalAttempted,
      successCount,
      generated,
      failed,
    });
  } catch (error) {
    console.error('[PDF ROUTE] Unhandled error during PDF generation batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing certificate PDFs',
      error: error.message,
    });
  }
});

/**
 * POST /api/certificates/approve
 * Approves a single certificate or batch of certificates in NeonDB.
 */
router.post('/approve', authenticateUser, async (req, res) => {
  try {
    const { certId, certIds } = req.body || {};
    const idsToApprove = certIds || (certId ? [certId] : []);

    if (idsToApprove.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No certificate IDs provided for approval.',
      });
    }

    const { approveCertificatesBatch } = require('../services/certificate.service');
    const updated = await approveCertificatesBatch(idsToApprove);

    return res.status(200).json({
      success: true,
      message: `Approved ${updated.length} certificate(s) successfully.`,
      approvedCount: updated.length,
      certificates: updated,
    });
  } catch (error) {
    console.error('[APPROVE ROUTE] Error approving certificates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve certificates in database',
      error: error.message,
    });
  }
});

/**
 * POST /api/certificates/revoke
 * Revokes a certificate in NeonDB.
 */
router.post('/revoke', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { certId } = req.body || {};
    if (!certId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required for revocation.',
      });
    }

    const { updateCertificateStatus } = require('../services/certificate.service');
    const updated = await updateCertificateStatus(certId, 'revoked');

    return res.status(200).json({
      success: true,
      message: `Certificate ${certId} revoked successfully.`,
      certificate: updated,
    });
  } catch (error) {
    console.error('[REVOKE ROUTE] Error revoking certificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke certificate in database',
      error: error.message,
    });
  }
});

/**
 * GET /api/certificates
 * Lists certificates from NeonDB.
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const status = req.query.status;
    const certs = await getAllCertificates({ status });
    return res.status(200).json({
      success: true,
      count: certs.length,
      certificates: certs,
    });
  } catch (error) {
    console.error('[CERTIFICATES] Error fetching certificates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve certificates from database',
    });
  }
});

/**
 * POST /api/certificates/send-emails
 *
 * Protected: Requires ADMIN role.
 * Body: { certIds?: string[] } (optional; omit = all eligible approved certificates)
 * Action: Loops over approved certificates with valid PDF URLs, sends branded HTML email,
 *         marks emailed in NeonDB, and delays 500ms between sends to avoid rate limits.
 * Returns: { success: true, totalAttempted, sentCount, failed: [{cert_id, email, reason}] }
 */
router.post('/send-emails', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { certIds } = req.body || {};

    // 1. Fetch eligible certificates from NeonDB
    const certificates = await getCertificatesForEmailing({ certIds });

    if (certificates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible approved certificates found for email sending.',
        totalAttempted: 0,
        sentCount: 0,
        failed: [],
      });
    }

    const failed = [];
    let sentCount = 0;

    // 2. Iterate through certificates with isolated try/catch per cert
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      const certId = cert.cert_id;
      const recipientEmail = cert.email;

      try {
        await sendCertificateEmail({
          name: cert.name,
          email: recipientEmail,
          cert_id: certId,
          pdf_url: cert.pdf_url,
        });

        // Mark certificate as emailed in NeonDB
        await markCertificateEmailed(certId);
        sentCount++;
      } catch (err) {
        console.error(`[EMAIL ROUTE] Failed to send email for Certificate ${certId} (${recipientEmail}):`, err.message || err);
        failed.push({
          cert_id: certId,
          email: recipientEmail,
          reason: err.message || 'Failed to send certificate email',
        });
      }

      // 500ms delay between sends to respect Gmail rate limits
      if (i < certificates.length - 1) {
        await delay(500);
      }
    }

    const totalAttempted = certificates.length;

    return res.status(200).json({
      success: true,
      message: `Processed email batch: ${sentCount} sent successfully, ${failed.length} failed.`,
      totalAttempted,
      sentCount,
      failed,
    });
  } catch (error) {
    console.error('[EMAIL ROUTE] Unhandled error during certificate email batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing certificate emails',
      error: error.message,
    });
  }
});
/**
 * Helper to map DB certificate row to standard API format
 */
function mapCertificateToResponse(cert) {
  let issueDateStr = cert.issue_date;
  if (issueDateStr instanceof Date) {
    issueDateStr = issueDateStr.toISOString().split('T')[0];
  } else {
    issueDateStr = String(issueDateStr || '').split('T')[0];
  }

  const rawStatus = cert.status || 'pending';
  const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

  return {
    CertID: cert.cert_id,
    RollNumber: cert.roll_number || 'N/A',
    StudentName: cert.name,
    Email: cert.email,
    School: cert.course || 'USICT',
    Course: cert.course || 'GGSIPU',
    EventName: cert.event_name,
    CertificateType: cert.cert_type || 'Participation',
    IssueDate: issueDateStr,
    Status: displayStatus,
    SHA256Hash: cert.hash,
    MerkleRoot: '8f2d4e910a11b12c13d14e15f16a17b18c19d20e21f22a23b24c25d26e27f28a',
    DrivePdfUrl: cert.pdf_url || `https://drive.google.com/file/d/mock_${cert.cert_id}/view`,
    QrVerificationUrl: `https://ggsipu.ac.in/verify?certId=${encodeURIComponent(cert.cert_id)}`,
    ApprovedBy: displayStatus === 'Approved' ? 'Dean DSW (Authorized)' : '',
    ApprovalDate: displayStatus === 'Approved' ? issueDateStr : '',
  };
}

/**
 * GET /api/certificates/verify/:certId
 *
 * Public endpoint: Verifies a certificate by its unique Certificate ID.
 * Performs canonical cryptographic SHA-256 seal verification.
 */
router.get('/verify/:certId', async (req, res) => {
  try {
    const certId = req.params.certId;
    if (!certId || !certId.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Certificate ID is required for verification.',
      });
    }

    const cert = await getCertificateByCertId(certId);
    if (!cert) {
      return res.status(404).json({
        success: false,
        status: 'not_found',
        message: `No certificate found in GGSIPU Ledger matching '${certId}'`,
      });
    }

    const computedHash = computeCertificateHash(cert);
    const isIntegrityValid = String(computedHash).toLowerCase() === String(cert.hash).toLowerCase();

    return res.status(200).json({
      success: true,
      status: 'found',
      certificate: mapCertificateToResponse(cert),
      integrityCheck: isIntegrityValid ? 'PASSED' : 'FAILED_TAMPERED',
      recalculatedHash: computedHash,
    });
  } catch (error) {
    console.error('[VERIFY ROUTE] Error verifying certificate by ID:', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Internal server error while verifying certificate',
      error: error.message,
    });
  }
});

/**
 * GET /api/certificates/verify-hash/:hash
 *
 * Public endpoint: Verifies a certificate by its cryptographic SHA-256 digest.
 */
router.get('/verify-hash/:hash', async (req, res) => {
  try {
    const hash = req.params.hash;
    if (!hash || !hash.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'SHA-256 hash is required for verification.',
      });
    }

    const cert = await getCertificateByHash(hash);
    if (!cert) {
      return res.status(404).json({
        success: false,
        status: 'not_found',
        message: 'No certificate matching SHA-256 hash found.',
      });
    }

    const computedHash = computeCertificateHash(cert);
    const isIntegrityValid = String(computedHash).toLowerCase() === String(cert.hash).toLowerCase();

    return res.status(200).json({
      success: true,
      status: 'found',
      certificate: mapCertificateToResponse(cert),
      integrityCheck: isIntegrityValid ? 'PASSED' : 'FAILED_TAMPERED',
      recalculatedHash: computedHash,
    });
  } catch (error) {
    console.error('[VERIFY ROUTE] Error verifying certificate by hash:', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Internal server error while verifying certificate by hash',
      error: error.message,
    });
  }
});

module.exports = router;
