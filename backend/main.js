import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cluster from 'node:cluster';
import * as http from 'node:http';
import * as https from 'node:https';

import { configDotenv } from 'dotenv';
import { setUpCluster, setUpWorker } from './config/cluster/_cluster.js';
import { fs_lib, io_lib, rabbitmq_lib, request_lib, session_lib, permission_lib, readyHooks_lib, uploadHooks_lib } from './config/lib/_lib.js';
import { connect_redis, connect_postgres } from './config/database/_database.js';
import { loadModules } from './loader.js';
import { permission_middleware } from './config/middleware/_middleware.js';

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.path = path;
app.isDebug = process.env.NODE_ENV === 'development';

if (cluster.isPrimary) {
    setUpCluster(cluster);
} else {

    //Variables ---------------------------------------------------------------------------------------------------------
    app.port = process.env.PORT;
    app.assetPath = app.path.join(__dirname, 'assets');
    app.bundlePath = app.path.join(app.assetPath, 'bundle');
    app.uploadPath = app.path.join(__dirname, 'uploads');
    app.publicPath = app.path.join(__dirname, 'public');
    app.modulePath = app.path.join(__dirname, 'modules');

    app.database = {};
    app.model = {};
    app.middleware = {};
    app.sequelize = {
        obj2Db: {},
    };
    // app.parentMenu = {
    //     finance: {
    //         index: 5000, title: 'Kế hoạch - Tài chính', link: '/user/finance', icon: 'fa-credit-card',
    //         subMenusRender: false, groups: ['Học phí Đại Học', 'Học phí Sau Đại Học', 'Quản lý thuế TNCN']
    //     },
    //     setting: {
    //         index: 2000, title: 'Cấu hình', link: 'user/setting', icon: 'bi-gear-fill',
    //         subMenusRender: true
    //     },
    //     bql: {
    //         index: 3000, title: 'Ban Dự án', icon: 'bi-map',
    //         subMenusRender: true,
    //     },
    // };

    // Server -----------------------------------------------------------------------------------------------------------
    const server = app.isDebug ?
        http.createServer(app) :
        https.createServer({
            cert: app.fs.readFileSync(process.env.CERT_PATH),
            key: app.fs.readFileSync(process.env.KEY_PATH),
        }, app);

    (async () => {
        // Parent menu ----------------------------------------------------------------------------------------------------------------------------------

        setUpWorker(app, server);
        request_lib(app);

        // Database ---------------------------------------------------------------------------------------------------------
        await connect_redis(app);
        await connect_postgres(app);
        readyHooks_lib(app);

        // Libraries --------------------------------------------------------------------------------------------------------
        fs_lib(app);
        app.fs.createFolder(app.assetPath, app.bundlePath, app.uploadPath, app.publicPath);
        await io_lib(app, server);
        session_lib(app);
        await rabbitmq_lib(app);

        readyHooks_lib(app);
        uploadHooks_lib(app);
        permission_middleware(app);
        permission_lib(app);

        await loadModules(app);
    })();


    // TODO: Ready hooks

    // Modules ----------------------------------------------------------------------------------------------------------
    server.listen(app.port);
    // temp
    app.get('/api/danh-muc/:param1/:param2', async (req, res) => {
        const { param1, param2 } = req.params;
        res.json({ message: `Danh muc from the backend! You passed ${param1} and ${param2}` });
    });

    app.get('/api/danh-muc/:param1', async (req, res) => {
        const { param1 } = req.params;
        const { q } = req.query;
        res.json({ message: `Danh muc from the backend! param1: ${param1} and q: ${q}` });
    });

    app.get('/api/danh-muc', async (req, res) => {
        res.json({ message: `Danh muc from the backend!` });
    });
}
