import http from 'http';
import pmx from 'pmx';
import { ApiController } from './ApiController';

pmx.initModule<{ port: number; secret: string | null }>({}, (error, config) => {
  if (error) {
    console.error(error);
    return;
  }

  http
    .createServer(async (req, res) => {
      const apiController = new ApiController({ req, res, secret: config.secret });
      await apiController.route();
    })
    .listen(config.port)
    .on('listening', () => {
      console.log(`Listening for api on ${config.port}`);
    })
    .on('error', err => {
      console.error(err);
    });
});
