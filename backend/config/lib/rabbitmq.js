import amqp from 'amqplib';

export async function rabbitmq_lib(app) {
    let consumeContainer = [];
    app.messageQueue = {
        consume: (queue, callBack) => consumeContainer.push({ queue, callBack }),
    };

    try {
        const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASS } = process.env;
        const connection = await amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`);
        console.log(` - #${process.pid}: The Amqp connection succeeded.`);
        app.messageQueue.connection = connection;
        const channel = await connection.createChannel();

        app.messageQueue.send = (queue, message) => {
            if (typeof message == 'object') message = JSON.stringify(message);
            channel.assertQueue(queue, { durable: false });
            channel.sendToQueue(queue, Buffer.from(message));
        };

        app.messageQueue.consume = (queue, callBack) => {
            channel.assertQueue(queue, { durable: false });
            channel.consume(queue, message => callBack(message.content.toString()), { noAck: true });
        };

        consumeContainer.forEach(({ queue, callBack }) => app.messageQueue.consume(queue, callBack));
        consumeContainer = null;
    } catch (error) {
        app.messageQueue = app.isDebug ? { isUnavailable: true, connection: true, consume: () => { }, send: () => { } } : { isUnavailable: true, };
        console.log(` - #${process.pid}: The Amqp connection failed!`);
    }
}