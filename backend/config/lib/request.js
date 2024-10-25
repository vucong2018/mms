import compression from 'compression';
import helmet from 'helmet';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import cors from 'cors';

export function request_lib(app) {
    app.use(compression());

    const oneYear = 365 * 24 * 60 * 60 * 1000;
    app.use('/', express.static(app.publicPath, { maxAge: oneYear }));

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 }));

    // CORS ---------------------------------------------------------------------------------------------------------
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', process.env.COR_ALLOW_ORIGIN || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
        next();
    });

    // app.use(cors({
    //     origin: 'http://localhost:3002',
    //     credentials: true,
    //     methods: 'GET, POST, PUT, DELETE',
    //     allowedHeaders: 'Content-Type, Authorization'
    // }));



    // Security ---------------------------------------------------------------------------------------------------------
    app.use(helmet.dnsPrefetchControl()); // DNS Prefetching
    app.use(helmet.frameguard()); // Clickjacking
    app.use(helmet.hidePoweredBy()); // Hide X-Powered-By
    app.use(helmet.hsts()); // HTTP Strict Transport Security
    app.use(helmet.ieNoOpen()); // IE No Open
    app.use(helmet.xssFilter()); // XSS Filter
    app.use(helmet.permittedCrossDomainPolicies()); // Permitted Cross Domain Policies
    app.use(helmet.referrerPolicy()); // Referrer Policy

    app.getUploadForm = (dest = app.uploadPath, accept, limits) => multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                app.fs.createFolder(dest);
                cb(null, dest);
            },
            filename: function (req, file, cb) {
                //required that filename must have file extension
                const filename = `${crypto.randomUUID()}.${file.originalname.split('.').pop()}`;
                cb(null, filename);
            }
        }),
        fileFilter: function (req, file, callback) {
            if (accept) {
                const insensitiveExt = path.extname(file.originalname).toLowerCase();
                const insensitiveAccept = accept.split(',').map(a => a.toLowerCase());
                //cannot handle wildcard like image/*, video/*, audio/*
                if (!insensitiveAccept.includes(insensitiveExt)) {
                    return callback(new Error('Unaccepted file types: refer to uploadFiles middleware accept config'));
                }
            }
            callback(null, true);
        },
        limits: limits
    });

    app.middleware = {};

    app.middleware.uploadFiles = (config) => {
        return async (req, res, next) => {
            try {
                //for limits, refer to multer limits config
                const { dest, fields, accept, limits } = config;
                if (!dest) throw new Error('dest is required');
                if (!Array.isArray(fields)) throw new Error('fields must be an array of objects with name and optional maxCount');

                const finalLimits = {
                    fileSize: 1024 * 1024 * 1024 * 10, //default max file size is 10GiB
                    ...limits
                };

                const destSegments = dest.split(path.sep);
                const resolvedSegments = destSegments.map(segment => {
                    if (segment.startsWith(':')) {
                        const paramName = segment.slice(1); // Remove the leading ':'
                        const paramValue = req.params[paramName];
                        if (!paramValue) {
                            throw new Error(`missing parameter value for ${paramName}, refer to uploadFiles middleware dest config`);
                        }
                        return paramValue;
                    } else {
                        return segment;
                    }
                });
                const finalDest = resolvedSegments.join(path.sep);

                const fileHandler = app.getUploadForm(finalDest, accept, finalLimits);
                return fileHandler.fields(fields)(req, res, next);
            } catch (e) {
                console.error('Error in uploadFiles middleware: ', e);
                res.status(500).send({ error: 'Internal server error' });
            }
        };
    };
}
