
import session from 'express-session';
import RedisStore from 'connect-redis';
import cookieParser from 'cookie-parser';
export function session_lib(app) {
    const sessionKey = process.env.SESSION_KEY,
        redisSessionPrefix = `${sessionKey}:session:`;
    const sessionOptions = {
        store: new RedisStore({ client: app.database.redis, prefix: redisSessionPrefix }),
        name: 'mms_session',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            sameSite: 'lax',
            maxAge: 3600000 * 24 * 7,
            httpOnly: true,
        }
    };

    app.set('trust proxy', 1); // trust first proxy
    const sessionMiddleware = session(sessionOptions);
    app.use(sessionMiddleware);
    app.readyHooks.add('socketConnectSession', {
        ready: () => app.io,
        run: () => app.io.use((socket, next) => sessionMiddleware(socket.request, sessionOptions, next)),
    });
    app.session = {
        sessionIdPrefix: redisSessionPrefix,

        getId: req => sessionIdPrefix + req.sessionID,

        refresh: async (...emails) => {
            const updateKey = (keys) => new Promise((resolve) => {
                app.database.redis.mget(keys, async (error, items) => {
                    if (error || !items || !items.length) {
                        resolve();
                    } else {
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i], item = JSON.parse(items[i]);
                            // Refresh user's session
                            if (item && item.user && emails.includes(item.user.email)) {
                                try {
                                    const user = await app.model.fwUser.get({ email: item.user.email });
                                    if (user) {
                                        const sessionUser = await app.updateSessionUser(null, user);
                                        if (sessionUser) {
                                            item.user = sessionUser;
                                            app.database.redis.set(key, JSON.stringify(item), () => console.log(' - Update session', key, ':', sessionUser.email));
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }
                        }
                        resolve();
                    }
                });
            });

            const promiseUpdate = () => new Promise(resolve => {
                app.database.redis.keys(sessionIdPrefix + '*', async (error, keys) => {
                    if (keys && keys.length) {
                        while (keys.length) {
                            await updateKey(keys.splice(0, 50));
                        }
                    }
                    resolve();
                });
            });

            if (app.database.redis) {
                await promiseUpdate();
            }
        }
    };

    // Read cookies (needed for auth)
    app.use(cookieParser());
}