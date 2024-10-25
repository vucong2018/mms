import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export async function io_lib(app, server) {
    try {

        const io = new Server(server);
        const { REDIS_HOST, REDIS_PORT } = process.env;
        const pubClient = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
        const subClient = pubClient.duplicate();

        await Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        app.io = io;

        const socketListeners = {};
        app.io.addSocketListener = (name, listener) => socketListeners[name] = listener;

        app.io.getSessionUser = socket => {
            const sessionUser = socket.request.session ? socket.request.session.user : null;
            if (sessionUser) {
                delete sessionUser.password;
                delete sessionUser.token;
                delete sessionUser.tokenDate;
            }
            return sessionUser;
        };

        function joinSystem(socket) {
            const rooms = Array.from(socket.rooms).slice(1);
            rooms.forEach(room => socket.leave(room));
            const sessionUser = app.io.getSessionUser(socket);

            // User connection
            if (sessionUser) {
                // Join with room of current user email
                sessionUser && sessionUser.email && socket.join(sessionUser.email.toString());

                // Remove all listener
                const eventNames = socket.eventNames().filter(event => !['disconnect', 'system:join'].includes(event));
                eventNames.forEach(event => socket.removeAllListeners(event));

                // Run all socketListeners
                Object.values(socketListeners).forEach(socketListener => socketListener(socket));
            } else {
                // Join with room of system
                socket.on('system:guest-join', (data) => {
                    const { phoneNumber } = data;
                    socket.join(phoneNumber);
                });
            }
        }

        app.io.on('connection', socket => {
            app.isDebug && console.log(` - Socket ID ${socket.id} connected!`);
            app.isDebug && socket.on('disconnect', () => console.log(` - Socket ID ${socket.id} disconnected!`));
            socket.on('system:join', () => joinSystem(socket));
            joinSystem(socket);
        });

    } catch (error) {
        console.error(` - #${process.pid}: Socket connection throw error:`, error.message);
    }
}