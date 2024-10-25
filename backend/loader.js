import { URL } from 'node:url';

export async function loadModules(app) {

    const readRecursive = async (dir, action) => {
        const files = [];
        const dirents = app.fs.readdirSync(dir, { withFileTypes: true });

        for (const dirent of dirents) {
            const path = app.path.join(dir, dirent.name);
            if (dirent.isDirectory()) {
                readRecursive(path, action);
            } else {
                await action(path);
                files.push(path);
            }
        }
        return files;
    };


    const requireModule = async (modulePath) => {
        if (modulePath.endsWith('.js')) {
            const fileUrl = new URL(`file://${app.path.resolve(modulePath)}`);
            const loaderImport = await import(fileUrl.href);
            if (loaderImport?.default) loaderImport.default(app);
        }
    };
    await readRecursive(app.modulePath, requireModule);
}