import { createClient } from 'redis';

// const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.connected = true;

    this.client.on('connect', () => {
      // console.log('conected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.log(`Error:${err}`);
      this.connected = false;
    });

    // Promisify the 'set' method
    // this.getAsync = promisify(this.client.get).bind(this.client);

    // Promisify the 'set' method
    // this.SetAsync = promisify(this.client.set).bind(this.client);

    // Promisify the 'del' method
    // this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.connected;
  }

  get(key) {
    return new Promise((resolve, reject) => {
      this.client.GET(key, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  //   async get(key) {
  //     const value = this.getAsync(key);
  //     return value;
  //   }

  set(key, value, expiration) {
    return new Promise((resolve, reject) => {
      this.client.SET(key, value, 'EX', expiration, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  //   async set(key, value, expiration) {
  //       await this.setAsync(key, value, 'EX', expiration);
  //   }

  //   async del(key) {
  //     const result = await this.delAsync(key);
  //     console.log(`Deleted key: ${key}`);
  //     return result;
  //   }

  del(key) {
    return new Promise((resolve, reject) => {
      this.client.DEL(key, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

export default redisClient;
