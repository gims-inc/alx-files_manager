import appController from '../controllers/AppController';

const express = require('express');

const router = express.Router();

// middleware that is specific to this router
router.use((req, res, next) => {
  console.log(`Time:${Date.now()} ${req.path} ${req.method}`);
  next();
});

router.get('/status', appController.getStatus);

router.get('/stats', appController.getStats);

module.exports = router;
