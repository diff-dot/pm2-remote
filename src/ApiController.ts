import { IncomingMessage, ServerResponse } from 'http';
import pm2, { ProcessDescription } from 'pm2';

export class ApiController {
  private req: IncomingMessage;
  private res: ServerResponse;
  private secret: string | null;

  constructor(args: { req: IncomingMessage; res: ServerResponse; secret: string | null }) {
    const { req, res, secret } = args;
    this.req = req;
    this.res = res;
    this.secret = secret;
  }

  public async route(): Promise<void> {
    if (!this.req.url) return this.sendError(404);
    const queryStringMatch = this.req.url.match(/\?(.*)/);
    if (!queryStringMatch) return this.sendError(404);

    const searchParams = new URLSearchParams(queryStringMatch[1]);
    const action = searchParams.get('action');
    const target = searchParams.get('target');

    // Query Validation
    if (!action || !target) return this.sendError(401);

    // Check secert
    if (this.secret && this.secret !== this.req.headers['x-pm2-secret']) {
      return this.sendError(403);
    }

    // Check registered process when target is all
    if (target === 'all') {
      await this.connectPM2();
      const processes = await this.processes();
      if (!processes.length) return this.sendError(500, 'No process registered in pm2');
    }

    try {
      switch (action) {
        case 'stop':
          await this.stopProcess(target);
          this.sendOK();
          break;

        case 'start':
          await this.startProcess(target);
          this.sendOK();
          break;

        case 'restart':
          await this.restartProcess(target);
          this.sendOK();
          break;

        default:
          this.sendError(404);
          break;
      }
    } catch (e) {
      return this.sendError(500, e.toString());
    }
  }

  private sendError(statusCode: number, message?: string): void {
    this.res.statusCode = statusCode;
    this.sendJson({ error: { code: statusCode, message: message || this.defaultErrorMessage(statusCode) } });
  }

  private sendOK(): void {
    this.sendJson({ result: 'OK' });
  }

  private sendJson(data: Record<string, unknown>): void {
    this.res.setHeader('Content-Type', 'application/json');
    this.res.end(JSON.stringify(data));
  }

  private defaultErrorMessage(statusCode: number): string {
    return Math.floor(statusCode / 100) === 4 ? 'Invalid request' : 'Internal server error';
  }

  private connectPM2(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private stopProcess(target: 'all' | string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.stop(target, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private startProcess(target: 'all' | string): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.start(target, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private restartProcess(target: 'all' | string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.restart(target, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private processes(): Promise<ProcessDescription[]> {
    return new Promise((resolve, reject) => {
      pm2.list((err, res) => {
        if (err) return reject(res);
        return resolve(res);
      });
    });
  }
}
