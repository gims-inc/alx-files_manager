import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line import/no-named-as-default
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    /* By using the header Authorization and the technique of the Basic auth
    (Base64 of the <email>:<password>),
    find the user associate to this email and with this password
    (reminder: we are storing the SHA1 of the password) */
    const authData = req.header('Authorization');
    let userEmail = authData.split(' ')[1];
    const buff = Buffer.from(userEmail, 'base64');
    userEmail = buff.toString('ascii');
    const data = userEmail.split(':');
    if (data.length !== 2) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hashedPassword = sha1(data[1]);
    const users = dbClient.db.collection('users');
    users.findOne({ email: data[0], password: hashedPassword }, async (err, user) => {
      if (user) {
        // Create a key: auth_<token>
        const token = uuidv4();
        const key = `auth_${token}`;
        /* Use this key for storing in Redis (by using the redisClient create previously)
        the user ID for 24 hours */
        await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
        /* Return this token: { "token": "155342df-2399-41da-9e8c-458b6ac52a0c" }
        with a status code 200 */
        res.status(200).json({ token });
      } else {
        // If no user has been found, return an error Unauthorized with a status code 401
        res.status(401).json({ error: 'Unauthorized' });
      }
    });
  }

  static async getDisconnect(req, res) {
    // Retrieve the user based on the token:
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (id) {
      // delete the token in Redis and return nothing with a status code 204
      await redisClient.del(key);
      res.status(204).json({});
    } else {
      // If not found, return an error Unauthorized with a status code 401
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = AuthController;
