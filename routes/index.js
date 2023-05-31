import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const express = require('express');

const router = express.Router();

// middleware that is specific to this router

router.use((req, res, next) => {
  console.log(`Time:${Date.now()} ${req.path} ${req.method}`);
  next();
});

router.get('/status', AppController.getStatus);

router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);

module.exports = router;
