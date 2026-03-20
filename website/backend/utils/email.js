const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendLowAttendanceAlert = async ({ studentEmail, studentName, subjectName, percentage, teacherName }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL SKIPPED] Low attendance alert for ${studentName} (${percentage}%) - configure EMAIL_USER/PASS`);
    return false;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: studentEmail,
      subject: `⚠️ Low Attendance Warning – ${subjectName}`,
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;background:#08080d;color:#e8e9f0;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="width:36px;height:36px;background:#1a9e6d;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">📡</div>
            <span style="font-size:20px;font-weight:700;color:#fff">AttendAI</span>
          </div>
          <h2 style="color:#fbbf24;margin:0 0 8px">Attendance Below Threshold</h2>
          <p style="color:#9b9eb0;margin:0 0 24px">This is an automated alert from your institution's attendance system.</p>
          <div style="background:#1a1a24;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 8px"><span style="color:#7a7d94">Student:</span> <strong>${studentName}</strong></p>
            <p style="margin:0 0 8px"><span style="color:#7a7d94">Subject:</span> <strong>${subjectName}</strong></p>
            <p style="margin:0 0 8px"><span style="color:#7a7d94">Current Attendance:</span> 
              <strong style="color:#f87171">${percentage}%</strong></p>
            <p style="margin:0"><span style="color:#7a7d94">Required:</span> <strong style="color:#3dba87">75%</strong></p>
          </div>
          <p style="color:#9b9eb0;font-size:14px">Please contact <strong>${teacherName}</strong> or your academic advisor immediately to discuss your attendance.</p>
          <p style="color:#565a76;font-size:12px;margin-top:32px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px">
            This is an automated message from AttendAI. Do not reply to this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return false;
  }
};

module.exports = { sendLowAttendanceAlert };
