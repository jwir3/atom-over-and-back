'use babel';

import fs from 'fs';
import path from 'path';

/**
 * A class that loads data fixtures in from files located in fixtures/.
 */
export class FixtureLoader {
  constructor(dataFunction) {
    var self = this;

    this.fixtureFiles = [];
    this.promise = new Promise((resolve, reject) => {
      let fixturePath = path.join(__dirname, 'fixtures');
      let fixtureFilePaths = [];
      fs.readdir(fixturePath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          for (let idx in files) {
            let key = files[idx].split(".")[0];
            let fullPath = path.join(fixturePath, files[idx]);

            fs.readFile(fullPath, (err, data) => {
              if (err) {
                reject(err);
              } else {
                let textData = data.toString().trim();
                self.fixtureFiles[key] = {
                  'data': textData,
                  'path': fullPath
                }

                if (Object.keys(self.fixtureFiles).length == files.length) {
                  resolve(self.fixtureFiles);
                }
              }
            });
          }
        }
      })
    });

    this.promise.then(dataFunction);
  }

  getFiles() {
    let self = this;
    return new Promise((resolve, reject) => {
      this.promise.then((data) => {
        let files = [];
        let keys = Object.keys(data);
        for (var idx in keys) {
          let nextKey = keys[idx];
          let fixtureFileObject = self.fixtureFiles[nextKey];
          files.push(fixtureFileObject.path);
        }

        resolve(files);
      });
    });
  }

  getPromise() {
    return this.promise;
  }
}
