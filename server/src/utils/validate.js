const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

function cleanMember(m = {}) {
  return {
    name: str(m.name),
    email: str(m.email).toLowerCase(),
    phone: str(m.phone).replace(/\D/g, '').slice(-10), // strips +91, spaces, dashes
    college: str(m.college),
    department: str(m.department) || undefined,
    year: m.year ? Number(m.year) : undefined,
    rollNo: str(m.rollNo) || undefined,
  };
}

// Returns { errors: string[], data: { teamName, members[] } }
function validateRegistration(body = {}, teamSize = 2) {
  const errors = [];
  const teamName = str(body.teamName);
  if (teamName.length < 2 || teamName.length > 60) errors.push('teamName must be 2-60 characters');

  if (!Array.isArray(body.members) || body.members.length !== teamSize) {
    errors.push(`Exactly ${teamSize} members are required`);
    return { errors, data: null };
  }

  const members = body.members.map(cleanMember);
  members.forEach((m, i) => {
    const p = `members[${i}]`;
    if (!m.name) errors.push(`${p}.name is required`);
    if (!EMAIL_RE.test(m.email)) errors.push(`${p}.email is invalid`);
    if (!PHONE_RE.test(m.phone)) errors.push(`${p}.phone must be a 10-digit mobile number`);
    if (!m.college) errors.push(`${p}.college is required`);
    if (m.year !== undefined && !(m.year >= 1 && m.year <= 5)) errors.push(`${p}.year must be 1-5`);
  });

  // The two people in one team can't share an email/phone
  if (new Set(members.map((m) => m.email)).size !== members.length) errors.push('Members must have different emails');
  if (new Set(members.map((m) => m.phone)).size !== members.length) errors.push('Members must have different phone numbers');

  return { errors, data: { teamName, members } };
}

module.exports = { validateRegistration };
