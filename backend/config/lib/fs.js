import fs from 'fs-extra';
import archiver from 'archiver';

export function fs_lib(app) {
    app.fs = fs;

    app.fs.createFolder = function () {
        for (let i = 0; i < arguments.length; i++) {
            let folderPath = arguments[i];
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        }
    }

    app.fs.copyFolder = (source, destination) => {
        fs.copySync(source, destination);
    }

    app.fs.deleteSubject = (subjectPath) => {
        if (fs.existsSync(subjectPath)) {
            fs.removeSync(subjectPath);
        }
    }

    app.fs.zipFolder = (source, destination) => {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(destination);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(source, false);
            archive.finalize();
        });
    }
}
