const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const qrcode = require('qrcode');

/**
 * Generates a high-resolution, professionally formatted Certificate PDF with embedded QR Code
 * and cryptographic verification metadata using pdf-lib.
 *
 * @param {Object} cert - Certificate metadata from database
 * @param {string} cert.cert_id - Unique Certificate ID
 * @param {string} cert.name - Recipient Name
 * @param {string} [cert.roll_number] - Student Roll / Enrollment Number
 * @param {string} [cert.course] - Academic Course / School
 * @param {string} [cert.event_name] - Event / Hackathon / Activity Title
 * @param {string} [cert.cert_type] - Type of Certificate (e.g. Merit, Participation)
 * @param {string|Date} [cert.issue_date] - Issue Date
 * @param {string} [cert.hash] - SHA-256 Cryptographic Hash
 * @returns {Promise<Buffer>} PDF file buffer
 */
async function generateCertificatePdf(cert) {
  // 1. Create a new PDF document (A4 Landscape: 842 x 595 points)
  const pdfDoc = await PDFDocument.create();
  const width = 842;
  const height = 595;
  const page = pdfDoc.addPage([width, height]);

  // 2. Embed standard serif and sans-serif fonts
  const fontTitle = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBodyBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  // 3. Define color palette
  const navy = rgb(0.04, 0.12, 0.28); // #0B1F47
  const gold = rgb(0.83, 0.65, 0.18); // #D4A62E
  const goldDark = rgb(0.65, 0.49, 0.10);
  const charcoal = rgb(0.2, 0.23, 0.28);
  const lightBg = rgb(0.99, 0.98, 0.96); // Warm subtle parchment

  // Background tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: height,
    color: lightBg,
  });

  // Outer decorative border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: navy,
    borderWidth: 4,
  });

  // Inner gold accent border
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: gold,
    borderWidth: 1.5,
  });

  // Corner ornamental squares
  const corners = [
    { x: 23, y: 23 },
    { x: width - 35, y: 23 },
    { x: 23, y: height - 35 },
    { x: width - 35, y: height - 35 },
  ];
  corners.forEach(c => {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: 12,
      height: 12,
      color: gold,
      borderColor: navy,
      borderWidth: 1,
    });
  });

  // 4. Generate & Embed QR Code (Verification URL)
  const baseUrl = process.env.FRONTEND_URL || process.env.VERIFICATION_BASE_URL || 'https://ggsipu.ac.in';
  const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify?certId=${encodeURIComponent(cert.cert_id)}`;

  const qrPngDataUrl = await qrcode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 250,
    color: {
      dark: '#0B1F47',
      light: '#FFFFFF',
    },
  });

  const qrImageBytes = Buffer.from(qrPngDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 85;
  const qrX = width - 140;
  const qrY = 45;

  // Draw QR code and verification label
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  page.drawText('Scan to Verify', {
    x: qrX + 8,
    y: qrY - 10,
    size: 8,
    font: fontBodyBold,
    color: navy,
  });

  // 5. Header Section
  const univTitle = 'GURU GOBIND SINGH INDRAPRASTHA UNIVERSITY';
  const univTitleWidth = fontTitle.widthOfTextAtSize(univTitle, 20);
  page.drawText(univTitle, {
    x: (width - univTitleWidth) / 2,
    y: height - 65,
    size: 20,
    font: fontTitle,
    color: navy,
  });

  const univSub = 'Sector 16-C, Dwarka, New Delhi - 110078 | Directorate of Students\' Welfare';
  const univSubWidth = fontBody.widthOfTextAtSize(univSub, 10);
  page.drawText(univSub, {
    x: (width - univSubWidth) / 2,
    y: height - 82,
    size: 10,
    font: fontBody,
    color: charcoal,
  });

  // Top decorative divider line
  page.drawLine({
    start: { x: 120, y: height - 95 },
    end: { x: width - 120, y: height - 95 },
    thickness: 1,
    color: gold,
  });

  // Certificate Type Banner
  const certType = String(cert.cert_type || 'Participation').toUpperCase();
  const bannerText = `CERTIFICATE OF ${certType}`;
  const bannerWidth = fontTitle.widthOfTextAtSize(bannerText, 16);

  page.drawRectangle({
    x: (width - bannerWidth - 40) / 2,
    y: height - 135,
    width: bannerWidth + 40,
    height: 28,
    color: navy,
    borderColor: gold,
    borderWidth: 1,
  });

  page.drawText(bannerText, {
    x: (width - bannerWidth) / 2,
    y: height - 127,
    size: 16,
    font: fontTitle,
    color: gold,
  });

  // 6. Body Content
  const introText = 'This is proudly presented to';
  const introWidth = fontItalic.widthOfTextAtSize(introText, 13);
  page.drawText(introText, {
    x: (width - introWidth) / 2,
    y: height - 175,
    size: 13,
    font: fontItalic,
    color: charcoal,
  });

  // Student Name
  const studentName = String(cert.name || 'Recipient Name').toUpperCase();
  const nameSize = studentName.length > 25 ? 24 : 28;
  const nameWidth = fontTitle.widthOfTextAtSize(studentName, nameSize);
  page.drawText(studentName, {
    x: (width - nameWidth) / 2,
    y: height - 215,
    size: nameSize,
    font: fontTitle,
    color: navy,
  });

  // Underline for name
  page.drawLine({
    start: { x: Math.max(160, (width - nameWidth) / 2 - 20), y: height - 222 },
    end: { x: Math.min(width - 160, (width + nameWidth) / 2 + 20), y: height - 222 },
    thickness: 1.5,
    color: gold,
  });

  // Roll Number and Course / School
  const roll = cert.roll_number ? `Roll No: ${cert.roll_number}` : '';
  const course = cert.course ? `School / Dept: ${cert.course}` : '';
  const studentDetails = [roll, course].filter(Boolean).join('   |   ');

  if (studentDetails) {
    const detailsWidth = fontBodyBold.widthOfTextAtSize(studentDetails, 11);
    page.drawText(studentDetails, {
      x: (width - detailsWidth) / 2,
      y: height - 245,
      size: 11,
      font: fontBodyBold,
      color: charcoal,
    });
  }

  // Event Context
  const reasonText = 'for outstanding participation and successful completion at';
  const reasonWidth = fontItalic.widthOfTextAtSize(reasonText, 12);
  page.drawText(reasonText, {
    x: (width - reasonWidth) / 2,
    y: height - 275,
    size: 12,
    font: fontItalic,
    color: charcoal,
  });

  // Event Name
  const eventName = String(cert.event_name || 'University Academic Event');
  const eventSize = eventName.length > 35 ? 16 : 18;
  const eventWidth = fontTitle.widthOfTextAtSize(eventName, eventSize);
  page.drawText(eventName, {
    x: (width - eventWidth) / 2,
    y: height - 305,
    size: eventSize,
    font: fontTitle,
    color: goldDark,
  });

  // 7. Footer Details & Verification Metadata
  let issueDateStr = cert.issue_date;
  if (issueDateStr instanceof Date) {
    issueDateStr = issueDateStr.toISOString().split('T')[0];
  } else {
    issueDateStr = String(issueDateStr || new Date().toISOString().split('T')[0]).split('T')[0];
  }

  const certId = String(cert.cert_id || '');
  const hash = String(cert.hash || '');
  const truncatedHash = hash.length > 32 ? `${hash.substring(0, 20)}...${hash.substring(hash.length - 12)}` : hash;

  // Left Footer Info
  page.drawText(`Certificate ID: ${certId}`, {
    x: 50,
    y: 110,
    size: 9.5,
    font: fontBodyBold,
    color: navy,
  });

  page.drawText(`Issued On: ${issueDateStr}`, {
    x: 50,
    y: 95,
    size: 9,
    font: fontBody,
    color: charcoal,
  });

  page.drawText(`SHA-256 Digest: ${truncatedHash}`, {
    x: 50,
    y: 80,
    size: 8,
    font: fontMono,
    color: rgb(0.35, 0.38, 0.42),
  });

  // Center Signature Line
  const sigX = (width - 180) / 2;
  page.drawLine({
    start: { x: sigX, y: 75 },
    end: { x: sigX + 180, y: 75 },
    thickness: 1,
    color: charcoal,
  });

  const sigTitle = 'Prof. (Dr.) Dean, Students\' Welfare';
  const sigTitleWidth = fontBodyBold.widthOfTextAtSize(sigTitle, 10);
  page.drawText(sigTitle, {
    x: (width - sigTitleWidth) / 2,
    y: 60,
    size: 10,
    font: fontBodyBold,
    color: navy,
  });

  const sigAuth = 'Competent Authority, GGSIPU';
  const sigAuthWidth = fontItalic.widthOfTextAtSize(sigAuth, 9);
  page.drawText(sigAuth, {
    x: (width - sigAuthWidth) / 2,
    y: 47,
    size: 9,
    font: fontItalic,
    color: charcoal,
  });

  // Save and return buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateCertificatePdf,
};
