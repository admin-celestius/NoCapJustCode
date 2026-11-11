const router = require('express').Router();
const {
  checkAvailability,
  checkTeamName,
  createOrder,
  verifyPayment,
  getStatus,
  getAvailability,
  getPublicVerification,
  markAttendance,
  verifyPasskey,
  getAttendanceRoster,
  lookupPassForAdmin,
} = require('../controllers/registration.controller');

router.post('/admin/verify-passkey', verifyPasskey);
router.post('/admin/roster', getAttendanceRoster);
router.get('/admin/roster', getAttendanceRoster);
router.post('/admin/pass-lookup', lookupPassForAdmin);
router.get('/check-team', checkTeamName);
router.post('/check-team', checkTeamName);
router.post('/check', checkAvailability);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/availability', getAvailability);
router.get('/:code/verify', getPublicVerification);
router.post('/:code/checkin', markAttendance);
router.get('/:id/status', getStatus);

module.exports = router;
