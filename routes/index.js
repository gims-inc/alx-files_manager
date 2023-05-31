import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const express = require('express');

const api = express.Router();

// middleware that is specific to this api

api.use((req, res, next) => {
  console.log(`Time:${Date.now()} ${req.path} ${req.method}`);
  next();
});

api.get('/status', AppController.getStatus);

api.get('/stats', AppController.getStats);

api.post('/users', UsersController.postNew);

api.get('/connect', AuthController.getConnect);

api.get('/disconnect', AuthController.getDisconnect);

api.get('/users/me', UsersController.getMe);

module.exports = api;
