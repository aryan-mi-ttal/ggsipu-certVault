const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Initializes and returns a Google Drive API client.
 * Supports:
 * 1. OAuth2 User Credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) - Uses user's 15GB+ personal Drive quota
 * 2. Service Account Credentials (GOOGLE_SERVICE_ACCOUNT_KEY) - Uses Service Account for Google Workspace Shared Drives
 */
function getDriveClient() {
  // 1. Check for OAuth2 User Credentials
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Check for Service Account Key
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    return null;
  }

  let credentials;
  try {
    if (rawKey.trim().startsWith('{')) {
      credentials = JSON.parse(rawKey.trim());
    } else if (fs.existsSync(rawKey)) {
      const fileContent = fs.readFileSync(rawKey, 'utf8');
      credentials = JSON.parse(fileContent);
    } else {
      const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
      credentials = JSON.parse(decoded);
    }
  } catch (err) {
    console.warn('[DRIVE SERVICE] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', err.message);
    return null;
  }

  if (!credentials || !credentials.client_email || !credentials.private_key) {
    console.warn('[DRIVE SERVICE] GOOGLE_SERVICE_ACCOUNT_KEY is missing required service account fields.');
    return null;
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

function cleanFolderId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
}

/**
 * Uploads a PDF Buffer to Google Drive inside the configured GDRIVE_FOLDER_ID,
 * sets the file permission to public ('anyone can view'), and returns the shareable link and fileId.
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} certId - Unique Certificate ID (used as filename)
 * @returns {Promise<{ fileId: string, webViewLink: string, isMock?: boolean }>}
 */
async function uploadPdfToDrive(pdfBuffer, certId) {
  const rawFolderId = process.env.GDRIVE_FOLDER_ID;
  const folderId = cleanFolderId(rawFolderId);
  const drive = getDriveClient();
  const gasUrl = process.env.GAS_API_URL;
  const apiKey = process.env.ADMIN_API_KEY || 'GGSIPU_ADMIN_KEY_2026';

  // Option 1: Google Apps Script Webhook Relay (Direct personal Drive upload without Service Account quota limits)
  if (gasUrl) {
    try {
      console.log(`[DRIVE SERVICE] Uploading ${certId}.pdf via Google Apps Script relay...`);
      const base64Pdf = pdfBuffer.toString('base64');
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'uploadCertificatePdf',
          apiKey: apiKey,
          certId: certId,
          pdfBase64: base64Pdf,
          folderId: folderId,
        }),
      });

      const gasData = await gasRes.json();
      if (gasData && (gasData.fileUrl || gasData.fileId)) {
        const fileUrl = gasData.fileUrl || `https://drive.google.com/file/d/${gasData.fileId}/view?usp=sharing`;
        console.log(`[DRIVE SERVICE] Successfully uploaded ${certId}.pdf to Google Drive folder! Link: ${fileUrl}`);
        return {
          fileId: gasData.fileId || `drive_${certId}`,
          webViewLink: fileUrl,
          isMock: false,
        };
      }
    } catch (gasErr) {
      console.warn('[DRIVE SERVICE] Google Apps Script relay failed, falling back to direct Drive API:', gasErr.message);
    }
  }

  // Option 2: If Drive client or Folder ID is not configured
  if (!drive || !folderId) {
    console.log(`[DRIVE SERVICE] Notice: Drive credentials or GDRIVE_FOLDER_ID not set. Generating Drive reference for ${certId}.`);
    const mockFileId = `drive_${certId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    return {
      fileId: mockFileId,
      webViewLink: `https://drive.google.com/file/d/${mockFileId}/view?usp=sharing`,
      isMock: true,
    };
  }

  // Option 3: Upload directly via Google Drive API (OAuth2 or Service Account)
  try {
    const fileName = `${certId}.pdf`;
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: bufferStream,
    };

    const createRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const fileId = createRes.data.id;
    let webViewLink = createRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // Make file public reader
    try {
      await drive.permissions.create({
        fileId: fileId,
        supportsAllDrives: true,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`[DRIVE SERVICE] Public read permission granted for file ${fileName} (${fileId})`);
    } catch (permErr) {
      console.warn(`[DRIVE SERVICE] Warning setting public permission for ${fileId}:`, permErr.message);
    }

    console.log(`[DRIVE SERVICE] Successfully uploaded ${fileName} to Drive. Link: ${webViewLink}`);

    return {
      fileId: fileId,
      webViewLink: webViewLink,
      isMock: false,
    };
  } catch (error) {
    // Handle personal Gmail quota restriction gracefully
    if (error.message && error.message.includes('Service Accounts do not have storage quota')) {
      console.warn(`[DRIVE SERVICE] -------------------------------------------------------------`);
      console.warn(`[DRIVE SERVICE] GOOGLE POLICY NOTICE: Service accounts have 0 MB storage quota on personal @gmail.com Drive folders.`);
      console.warn(`[DRIVE SERVICE] Solutions to upload physical files to your personal Google Drive:`);
      console.warn(`[DRIVE SERVICE] 1. Set GAS_API_URL in .env (uses your personal 15GB Drive via Google Apps Script web app).`);
      console.warn(`[DRIVE SERVICE] 2. Use a Google Workspace Shared Drive.`);
      console.warn(`[DRIVE SERVICE] 3. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env.`);
      console.warn(`[DRIVE SERVICE] -------------------------------------------------------------`);
      
      const fallbackFileId = `1_GGSIPU_${certId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      return {
        fileId: fallbackFileId,
        webViewLink: `https://drive.google.com/file/d/${fallbackFileId}/view?usp=sharing`,
        isMock: true,
        quotaNotice: true,
      };
    }

    console.error(`[DRIVE SERVICE] Error uploading PDF ${certId} to Google Drive:`, error.message || error);
    throw new Error(`Google Drive upload error: ${error.message || 'Unable to upload file'}`);
  }
}

module.exports = {
  uploadPdfToDrive,
  getDriveClient,
  cleanFolderId,
};
