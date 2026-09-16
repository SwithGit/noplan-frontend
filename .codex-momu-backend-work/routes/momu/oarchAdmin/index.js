const express = require('express');
const { requireOarchAdmin } = require('../../../middleware/oarchAdminAuth');
const authRouter = require('./auth');
const customersRouter = require('./customers');
const historyRouter = require('./history');
const serialsRouter = require('./serials');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/customers', requireOarchAdmin, customersRouter);
router.use('/serials', requireOarchAdmin, serialsRouter);
router.use('/history', requireOarchAdmin, historyRouter);

module.exports = router;
