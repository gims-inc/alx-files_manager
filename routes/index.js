import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

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

api.post('/files', FilesController.postUpload);
// should retrieve the file document based on the ID:
api.get('/files/:id', FilesController.getShow);
// should retrieve all users file documents for a specific parentId
// and with pagination:
api.get('/files', FilesController.getIndex);

api.put('/files/:id/publish', FilesController.putPublish);

api.put('/files/:id/unpublish', FilesController.putUnpublish);

api.get('/files/:id/data', FilesController.getFile);

module.exports = api;
