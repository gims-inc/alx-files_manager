import sha1 from 'sha1';
// eslint-disable-next-line import/no-named-as-default
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null;
    // console.log(email); // debug
    const password = req.body ? req.body.password : null;

    // email is missing, return an error Missing email with a status code 400
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    // password is missing, return an error Missing password with a status code 400
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }
    const user = await (await dbClient.usersCollection()).findOne({ email });
    // email already exists in DB, return an error Already exist with a status code 400
    if (user) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }
    // password must be stored after being hashed in SHA1
    const insertionInfo = await (await dbClient.usersCollection())
      .insertOne({ email, password: sha1(password) });
    const userId = insertionInfo.insertedId.toString();
    // return email and the id (auto generated by MongoDB) with a status code 201
    res.status(201).json({ email, id: userId });
  }
}