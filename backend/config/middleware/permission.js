export default function permission_middleware(app) {
    app.middleware.permissionCheck = permissionCheck;
    app.middleware.permissionOrCheck = permissionOrCheck;
    app.middleware.responseError = responseError;
}

function responseError(req, res) {
    if (req.method.toLowerCase() === 'get') {
        if (req.originalUrl.startsWith('/api')) {
            res.status(401).send({ error: req.session.user ? 'request-permissions' : 'request-login' });
        } else {
            res.redirect(req.session.user ? '/request-permissions' : `/request-login?route=${req.path}`);
        }
    } else {
        res.status(401).send({ error: 'You don\'t have permission!' });
    }
}

function permissionCheck(...permissions) {
    return (req, res, next) => {
        const user = req.session.user,
            userPermissions = user.permissions;
        if (!user) {
            return responseError(req, res);
        } else if (!permissions.length) {
            return next();
        } else if (userPermissions.every(permission => user.permissions.includes(permission))) {
            return next();
        }
    };
}

function permissionOrCheck(...permissions) {
    return (req, res, next) => {
        const user = req.session.user,
            userPermissions = user.permissions;
        if (!user) {
            return responseError(req, res);
        } else if (!permissions.length) {
            return next();
        } else if (userPermissions.some(permission => user.permissions.includes(permission))) {
            return next();
        }
    };
}    
