const router = require('express').Router();
const {checkAvailability,
    createOrder,
    verifyPayment,
    getStatus,
    getAvailability
} = require('../controllers/registration.controller');

router.post('/check', checkAvailability);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/availability', getAvailability);
router.get('/:id/status', getStatus);

module.exports = router;
