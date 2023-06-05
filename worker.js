import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
// eslint-disable-next-line import/no-named-as-default
import dbClient from './utils/db';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

const fileQueue = new Queue('fileQueue', { redis: { port: redisPort, host: redisHost } });
const userQueue = new Queue('userQueue', { redis: { port: redisPort, host: redisHost } });

async function thumbNail(width, localPath) {
  const thumbnail = await imageThumbnail(localPath, { width });
  return thumbnail;
}

fileQueue.process(async (job, done) => {
  const { fileId } = job.data;
  if (!fileId) {
    done(new Error('Missing fileId'));
  }

  const { userId } = job.data;
  if (!userId) {
    done(new Error('Missing userId'));
  }

  console.log(`worker-js: fileQueue->Processing...${job.jobId}`);
  console.log(`worker-js:${fileId}, ${userId}`);

  const files = dbClient.db.collection('files');
  const idObject = new ObjectID(fileId);

  files.findOne({ _id: idObject }, async (err, file) => {
    if (!file) {
      console.log('Not found');
      done(new Error('File not found'));
    } else {
      const fileName = file.localPath;
      const thumbnail500 = await thumbNail(500, fileName);
      const thumbnail250 = await thumbNail(250, fileName);
      const thumbnail100 = await thumbNail(100, fileName);

      console.log('worker-js: Writing files to system');

      const image500 = `${file.localPath}_500`;
      const image250 = `${file.localPath}_250`;
      const image100 = `${file.localPath}_100`;

      await fs.writeFile(image500, thumbnail500);
      await fs.writeFile(image250, thumbnail250);
      await fs.writeFile(image100, thumbnail100);
      done();
    }
  });
});

fileQueue.on('completed', (job, result) => {
  const jobData = job.data;
  console.log(`worker-js: job ${jobData.jobId} completed with result: ${JSON.stringify(result)}`);
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error('Missing userId'));
  const users = dbClient.db.collection('users');
  const idObject = new ObjectID(userId);
  const user = await users.findOne({ _id: idObject });
  if (user) {
    console.log(`worker-js: Welcome ${user.email}!`);
  } else {
    done(new Error('User not found'));
  }
});
