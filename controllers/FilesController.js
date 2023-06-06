import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';
// eslint-disable-next-line import/no-named-as-default
import dbClient from '../utils/db';
// import redisClient from '../utils/redis';
import UsersController from './UsersController';

// eslint-disable-next-line no-unused-vars
// const { mkdir, writeFile } = fs;

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

const fileQueue = new Queue('fileQueue', { redis: { port: redisPort, host: redisHost } });

class FilesController {
  static async postUpload(req, res) {
    // Retrieve the user based on the token:
    const user = await UsersController.getUser(req);
    if (!user) {
      // If not found, return an error Unauthorized with a status code 401
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name } = req.body;
    const { type } = req.body;
    const { parentId } = req.body;
    const isPublic = req.body.isPublic || false;
    const { data } = req.body;
    //  same as (req.body.name, req.body.type)
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const files = dbClient.db.collection('files');
    /* If the parentId is set:
    If no file is present in DB for this parentId,
    return an error Parent not found with a status code 400
    If the file present in DB for this parentId is not of type folder,
    return an error Parent is not a folder with a status code 400 */
    if (parentId) {
      const idObject = new ObjectID(parentId);
      // The user ID should be added to the document saved in DB - as owner of a file
      const file = await files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        console.log(`parentId:${parentId}`); // debug
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        },
      ).then((result) => res.status(201).json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
      })).catch((error) => {
        console.log(error);
      });
    } else {
      // The relative path of this folder is given by the environment variable FOLDER_PATH
      // OR use /tmp/files_manager as storing folder path
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      // Create a local path in the storing folder with filename a UUID
      const fileName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, 'base64');
      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
          // pass. Error raised when file already exists
        }
        await fs.writeFile(fileName, buff, 'utf-8');
      } catch (error) {
        console.log(error);
      }
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: fileName,
        },
      ).then((result) => {
        res.status(201).json(
          {
            id: result.insertedId,
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          },
        );
        if (type === 'image') {
          fileQueue.add(
            {
              userId: user._id,
              fileId: result.insertedId,
            },
          );
        }
      }).catch((error) => console.log(error));
    }
    return null;
  }

  static async getShow(req, res) {
    /* Retrieve the user based on the token:
    If not found, return an error Unauthorized with a status code 401
    If no file document is linked to the user and the ID passed as parameter,
    return an error Not found with a status code 404
    Otherwise, return the file documen */
    const user = await UsersController.getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const idObject = new ObjectID(fileId);
    const file = await files.findOne({ _id: idObject, userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const user = await UsersController.getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Based on the query parameters parentId and page, return the list of file documen
    // No validation of parentId needed - if the parentId is not linked to any user folder,
    // returns an empty list
    // By default, parentId is equal to 0 = the root

    const {
      parentId,
      page,
    } = req.query;
    const pageNum = page || 0;
    const files = dbClient.db.collection('files');
    let query;
    if (!parentId) {
      query = { userId: user._id };
    } else {
      query = { userId: user._id, parentId: ObjectID(parentId) };
    }
    files.aggregate(
      // Pagination can be done directly by the aggregate of MongoDB
      // Each page should be 20 items max
      // page query parameter starts at 0 for the first page.
      // If equals to 1, it means it’s the second page (form the 20th to the 40th), etc
      [
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [{ $count: 'total' }, { $addFields: { page: parseInt(pageNum, 10) } }],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ],
    ).toArray((err, result) => {
      if (result) {
        const final = result[0].data.map((file) => {
          const tmpFile = {
            ...file,
            id: file._id,
          };
          delete tmpFile._id;
          delete tmpFile.localPath;
          return tmpFile;
        });
        return res.status(200).json(final);
      }
      console.log('Error occured');
      return res.status(404).json({ error: 'Not found' });
    });
    return null;
  }

  static async putPublish(req, res) {
    // set isPublic to true on the file document based on the ID:
    const user = await UsersController.getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Retrieve the user based on the token:
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const idObject = new ObjectID(id);
    const newValue = { $set: { isPublic: true } };
    const options = { returnOriginal: false };
    // f no file document is linked to the user and the ID passed as parameter,
    // return an error Not found with a status code 404
    files.findOneAndUpdate({ _id: idObject, userId: user._id }, newValue, options, (err, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(file.value);
    });
    return null;
  }

  static async putUnpublish(req, res) {
    const user = await UsersController.getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const idObject = new ObjectID(id);
    const newValue = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate({ _id: idObject, userId: user._id }, newValue, options, (err, file) => {
      if (!file.lastErrorObject.updatedExisting) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(file.value);
    });
    return null;
  }

  static async getFile(req, res) {
    // should return the content of the file document based on the ID:
    const { id } = req.params;
    const files = dbClient.db.collection('files');
    const idObject = new ObjectID(id);
    files.findOne({ _id: idObject }, async (err, file) => {
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }
      console.log(file.localPath);
      /* If the file document (folder or file) is not public (isPublic: false)
      and no user authenticate or not the owner of the file,
      return an error Not found with a status code 404 */
      if (file.isPublic) {
        /* If the type of the file document is folder,
        return an error A folder doesn't have content with a status code 400 */
        if (file.type === 'folder') {
          return res.status(400).json({ error: "A folder doesn't have content" });
        }
        // If the file is not locally present, return an error Not found with a status code 404
        try {
          let fileName = file.localPath;
          const size = req.param('size');
          if (size) {
            fileName = `${file.localPath}_${size}`;
          }
          /* By using the module mime-types, get the MIME-type based on the name of the file
            Return the content of the file with the correct MIME-type */
          const data = await fs.readFile(fileName);
          const contentType = mime.contentType(file.name);
          return res.header('Content-Type', contentType).status(200).send(data);
        } catch (error) {
          console.log(error);
          return res.status(404).json({ error: 'Not found' });
        }
      } else {
        const user = await UsersController.getUser(req);
        if (!user) {
          return res.status(404).json({ error: 'Not found' });
        }
        if (file.userId.toString() === user._id.toString()) {
          if (file.type === 'folder') {
            return res.status(400).json({ error: "A folder doesn't have content" });
          }
          try {
            let fileName = file.localPath;
            const size = req.param('size');
            if (size) {
              fileName = `${file.localPath}_${size}`;
            }
            const contentType = mime.contentType(file.name);
            return res.header('Content-Type', contentType).status(200).sendFile(fileName);
          } catch (error) {
            console.log(error);
            return res.status(404).json({ error: 'Not found' });
          }
        } else {
          console.log(`Wrong user: file.userId=${file.userId}; userId=${user._id}`);
          return res.status(404).json({ error: 'Not found' });
        }
      }
    });
  }
}

module.exports = FilesController;
