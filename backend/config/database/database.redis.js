import { createClient } from 'redis';

export async function connect_redis(app) {
    try {
        const { REDIS_HOST, REDIS_PORT } = process.env;
        app.database.redis = createClient({
            url: `redis://${REDIS_HOST}:${REDIS_PORT}`
        });

        await app.database.redis.connect();
        console.log(` - #${process.pid}: The Redis connection succeeded`);

        app.database.redis.on('error', error =>
            console.log(` - #${process.pid}: The Redis connection failed!`, error.message));
    } catch (error) {
        console.error(` - #${process.pid}: Redis connection throw error:`, error.message);
    }
}
