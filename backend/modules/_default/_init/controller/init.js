const Init = (app) => {
    const defaultUpload = app.getUploadForm();
    app.post('/api/upload', defaultUpload.any(), async (req, res) => {
        try {
            const { body, files } = req;
            if (!body.hookName) throw new Error('hookName is not provided');
            app.uploadHooks.run(body.hookName, req, res, files);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Tải file lên server bị lỗi' });
        }
    });

    app.state = {
        prefixKey: `${app.appName}_state:`,
        initState: {
            todayViews: 0,
            allViews: 0,
            logo: '',
        },

        init: async () => {
            try {
                const keys = await app.database.redis.keys(`${app.appName}_state:*`);
                if (keys) {
                    for (const key of Object.keys(app.state.initState)) {
                        const redisKey = `${app.appName}_state:${key}`;
                        if (!keys.includes(redisKey) && app.state.initState[key]) {
                            await app.database.redis.set(redisKey, app.state.initState[key]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error initializing state:', error);
            }
        },

        get: async (...params) => {
            try {
                const n = params.length, prefixKeyLength = app.state.prefixKey.length;
                const keys = n === 0 ? app.state.keys : params.map(key => `${app.state.prefixKey}${key}`);
                const values = await app.database.redis.mGet(keys);
                if (values == null) {
                    throw new Error('Error when get Redis value!');
                } else if (n == 1) {
                    return values[0];
                } else {
                    const state = {};
                    keys.forEach((key, index) => state[key.substring(prefixKeyLength)] = values[index]);
                    return state;
                }
            } catch (error) {
                console.error('Error getting state:', error);
                throw error;
            }
        },

        set: async (...params) => {
            try {
                const n = params.length;
                for (let i = 0; i < n - 1; i += 2) {
                    params[i] = app.state.prefixKey + params[i];
                }
                await app.database.redis.mSet(params);
            } catch (error) {
                console.error('Error setting state:', error);
                throw error;
            }
        },
    };

    app.state.keys = Object.keys(app.state.initState).map(key => app.state.prefixKey + key);
};

export default Init;