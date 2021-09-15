import * as fs from 'fs';
import { Buffer } from 'buffer';

class Hider {
  private readonly jpgEndBuffer: Buffer = Buffer.from([0xff, 0xd9]);
  private concatedBuffer!: Buffer;
  private buffers: Buffer[] = [];

  constructor(args: string[]) {
    this.loadBuffers(args);
    this.concatPhotos();
    this.saveToFile();
  }

  private loadBuffers(paths: string[]): void {
    paths.forEach(path => {
      try {
        const photo = fs.readFileSync(path);

        // photo bytecode can also contain some additional data like messages so I don't want to
        // load whole photo buffer
        const index = photo.indexOf(this.jpgEndBuffer);

        // save photo buffer but also keep the photo name
        this.buffers.push(photo.slice(0, index + 2), Buffer.from(path));
      } catch (err) {
        console.error('Could not open the file', path);
        process.exit(1);
      }
    });
  }

  private concatPhotos(): void {
    this.concatedBuffer = Buffer.concat(this.buffers);
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync('hidden.jpg', this.concatedBuffer);
    } catch (error) {
      console.error('Could not write the hidden.jpg');
      process.exit(1);
    }
  }
}

type Photo = {
  path: string,
  buffer: Buffer
}

class Extractor {
  private readonly jpgStartBuffer: Buffer = Buffer.from([0xff, 0xd8]);
  private readonly jpgEndBuffer: Buffer = Buffer.from([0xff, 0xd9]);
  private currentBuffer!: Buffer;
  private buffers: Photo[] = [];

  constructor(args: string[]) {
    this.loadBuffer(args[0]);
    this.checkIfThereIsPhotoHidden();
    this.extractBuffers();
    this.makeDir();
    this.extractPhotos();
  }

  private loadBuffer(path: string): void {
    try {
      this.currentBuffer = fs.readFileSync(path);
    } catch (error) {
      console.error('Could not open the file', path);
      process.exit(1);
    }
  }

  private checkIfThereIsPhotoHidden(): void {
    // if there is no FF D8 pair at the position other than the beginning of the buffer there is no additional jpg inside
    const isPhotoInside = this.currentBuffer.lastIndexOf(this.jpgStartBuffer) !== 0;

    if (!isPhotoInside) {
      console.log('There is no photo to extract!');
      process.exit(0);
    }
  }

  private extractBuffers(): void {
    while (true) {
      const tempPhoto = {} as Photo;
      
      // Index of buffer ending for the first photo
      const endIndex = this.currentBuffer.indexOf(this.jpgEndBuffer);
      tempPhoto.buffer = this.currentBuffer.slice(0, endIndex + 2);

      // slice the buffer so the beginning of the photo path is at index 0
      this.currentBuffer = this.currentBuffer.slice(endIndex + 2);

      // find the index of the next photo starting bytes so everything between 0
      // and this index is photo path
      const startIndex = this.currentBuffer.indexOf(this.jpgStartBuffer);

      if (startIndex === -1) {
        // there is no next photo so the whole buffer is just photo path
        tempPhoto.path = this.currentBuffer.toString('ascii');
        this.buffers.push(tempPhoto);
        break;
      } else {
        tempPhoto.path = this.currentBuffer.slice(0, startIndex).toString('ascii');
        this.buffers.push(tempPhoto);
        // move current buffer to the starting point of the next photo
        this.currentBuffer = this.currentBuffer.slice(startIndex);
      }
    }
  }

  private makeDir(): void {
    try {
      fs.accessSync('./extracted');
    } catch (_) {
      fs.mkdirSync('extracted');
    };
  }

  private extractPhotos(): void {
    this.buffers.forEach(({ buffer, path}) => {
      try {
        fs.writeFileSync(`extracted/${path}`, buffer);
      } catch (error) {
        console.error('Could not write the file', path);
        process.exit(1);
      }
    });

    console.log(`Extracted ${this.buffers.length} photo${this.buffers.length > 1 ? 's' : ''}`);
  }
}

class MessageReader {
  private photoBuffer!: Buffer;
  private readonly jpgEndBuffer: Buffer = Buffer.from([0xff, 0xd9]);

  constructor(path: string) {
    this.loadPhotoBuffer(path);
    this.readTheMessage();
  }

  private loadPhotoBuffer(path: string): void {
    try {
      this.photoBuffer = fs.readFileSync(path);
    } catch (error) {
      console.error('Could not open the file', path);
      process.exit(1);
    }
  }

  private readTheMessage(): void {
    const index = this.photoBuffer.indexOf(this.jpgEndBuffer);

    if (index + 2 === this.photoBuffer.length) {
      console.log('There is no message in this photo!');
      return;
    }

    const message = this.photoBuffer.slice(index + 2);
    console.log(message.toString('ascii'));
  }
}

class MessageSaver {
  private photoBuffer!: Buffer;
  private path: string;
  private readonly jpgEndBuffer: Buffer = Buffer.from([0xff, 0xd9]);

  constructor(args: string[]) {
    const [path, ...message] = args;
    this.path = path;
    this.loadPhotoBuffer();
    this.saveMessage(message.join(' '));
  }

  private loadPhotoBuffer(): void {
    try {
      this.photoBuffer = fs.readFileSync(this.path);
    } catch (error) {
      console.error('Could not open the file', this.path);
      process.exit(1);
    }
  }

  private saveMessage(message: string): void {
    // if there is an additional data inside the photo such as other message it will be overwritten
    const index = this.photoBuffer.indexOf(this.jpgEndBuffer);
    const messageBuffer = Buffer.from(message);
    const concatedBuffer = Buffer.concat([this.photoBuffer.slice(0, index + 2), messageBuffer]);
    try {
      fs.writeFileSync(this.path, concatedBuffer);
      console.log('Saved!');
    } catch (error) {
      console.error('Could not write the file', this.path);
      process.exit(1);
    }
  }
}

class MessageRemover {
  private photoBuffer!: Buffer;
  private path: string;
  private readonly jpgEndBuffer: Buffer = Buffer.from([0xff, 0xd9]);

  constructor(path: string) {
    this.path = path;
    this.loadPhotoBuffer();
    this.removeMessage();
  }

  private loadPhotoBuffer(): void {
    try {
      this.photoBuffer = fs.readFileSync(this.path);
    } catch (error) {
      console.error('Could not open the file', this.path);
      process.exit(1);
    }
  }

  private removeMessage(): void {
    const index = this.photoBuffer.indexOf(this.jpgEndBuffer);
    try {
      fs.writeFileSync(this.path, this.photoBuffer.slice(0, index + 2));
      console.log('Removed!');
    } catch (error) {
      console.error('Could not write the file', this.path);
      process.exit(1);
    }
  }
}

const displayUsage = (): void => {
  console.warn('========================== USAGE ==========================')
  console.warn('node hider.js --mode=hide <path1> <path2> <path3>...');
  console.warn('OR');
  console.warn('node hider.js --mode=extract <path>');
  console.warn('OR');
  console.warn('node hider.js --mode=savemessage <path> <message>')
  console.warn('OR');
  console.warn('node hider.js --mode=readmessage <path>')
  console.warn('OR');
  console.warn('node hider.js --mode=removemessage <path>')
  process.exit(1);
}

const args = process.argv.slice(2);

if (!args[0]?.startsWith('--mode=')) {
  displayUsage();
}

switch (args[0].split('=')[1]) {
  case 'hide':
    new Hider(args.slice(1));
    break;
  case 'extract':
    new Extractor(args.slice(1));
    break;
  case 'readmessage':
    new MessageReader(args[1]);
    break;
  case 'savemessage':
    new MessageSaver(args.slice(1));
    break;
  case 'removemessage':
    new MessageRemover(args[1]);
    break;
  default:
    displayUsage();
}
