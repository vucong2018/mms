import { createRequire } from 'node:module';
import cookieParser from 'cookie-parser';

export async function setUpWorker(app, server) {
    app.use(cookieParser());

    // Worker ---------------------------------------------------------------------------------------------------------
    const require = createRequire(import.meta.url);
    const appConfig = require('../../package.json');
    app.primaryWorker = process.env['primaryWorker'];
    app.appName = appConfig.name;
    app.defaultAdminEmail = appConfig.default.adminEmail;
    app.defaultAdminPassword = appConfig.default.adminPassword;

    let hasUpdate = new Set(); // Mỗi lần nodemon restart nó chỉ updateSessionUser 1 lần
    app.get('*', async (req, res, next) => {
        try {
            if (app.isDebug && req.session && req.session?.user) {
                await app.updateSessionUser(req, req.session.user);
                hasUpdate.add(req.session.user.email);
            }
            next();
        } catch (error) {
            console.error('app.get(*)', error);
            next();
        }
    });



    app.worker = {
        create: () => process.send({ type: 'createWorker' }),
        reset: (workerId) => process.send({ type: 'resetWorker', workerId, primaryWorker: app.primaryWorker }),
        shutdown: (workerId) => process.send({ type: 'shutdownWorker', workerId, primaryWorker: app.primaryWorker })
    };

    // Listen from MASTER ---------------------------------------------------------------------------------------------
    process.on('message', message => {
        if (message.type == 'workersChanged') {
            app.worker.items = message.workers;
        } else if (message.type == 'resetWorker') {
            server.close();
            process.exit(1);
        } else if (message.type == 'shutdownWorker') {
            process.exit(4);
        } else if (message.type == 'setPrimaryWorker') {
            app.primaryWorker = true;
        }
    });
}