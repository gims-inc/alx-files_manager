const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const HOST = process.env.DB_HOST;
    // eslint-disable-next-line radix
    const PORT = parseInt(process.env.DB_PORT);
    const DBNAME = process.env.DB_DATABASE;

    function dbURL(host = 'localhost', port = 27017) {
      const urlStr = `mongodb://${host}:${port}`;
      return urlStr;
    }

    this.connected = false;
    this.client = new MongoClient(dbURL(HOST, PORT), { useUnifiedTopology: true });

    this.client.connect((error) => {
      if (error) {
        this.connected = false;
        console.log(`Error: ${error}`);
      } else {
        this.connected = true;
        this.db = this.client.db(DBNAME || 'files_manager');
        // console.log('Connected successfully to server');
      }
    });

    // try {
    //   this.client.connect();
    //   console.log('Connected successfully to server');
    // } catch (error) {
    //   this.connected = false;
    //   console.log(`Error:${error}`);
    // }
  }

  // eslint-disable-next-line class-methods-use-this
  isAlive() {
    return this.connected;
  }

  // async nbUsers() {
  //   const usersCollection = this.db.collection('users');
  //   try {
  //     usersCollection.countDocuments();
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  nbUsers() {
    const usersCollection = this.db.collection('users');
    return new Promise((resolve, reject) => {
      usersCollection.countDocuments((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  // async nbFiles() {
  //   const filesCollection = this.db.collection('files');
  //   try {
  //     filesCollection.countDocuments();
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  nbFiles() {
    const filesCollection = this.db.collection('files');
    return new Promise((resolve, reject) => {
      filesCollection.countDocuments((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  async usersCollection() {
    return this.client.db().collection('users');
  }
}

export const dbClient = new DBClient();

export default dbClient;
