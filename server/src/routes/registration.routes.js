const router = require('express').Router();
const {
  checkAvailability,
  checkTeamName,
  createOrder,
  verifyPayment,
  getStatus,
  getAvailability,
} = require('../controllers/registration.controller');

router.get('/check-team', checkTeamName);
router.post('/check-team', checkTeamName);
router.post('/check', checkAvailability);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/availability', getAvailability);
router.get('/:id/status', getStatus);

module.exports = router;
