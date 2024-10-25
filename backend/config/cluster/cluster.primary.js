import { availableParallelism } from 'node:os';

export function setUpCluster(cluster) {
    const isDebug = process.env.NODE_ENV === 'development';
    const numCPUs = isDebug ? 2 : availableParallelism();
    const workers = {};
    for (let i = 0; i < numCPUs; i++) {
        const primaryWorker = i == 0;
        const worker = cluster.fork({ primaryWorker });
        worker.primaryWorker = primaryWorker;
        worker.status = 'running';
        worker.version = process.env.version;
        worker.createdDate = new Date();
        workers[worker.process.pid] = worker;
    }

    const workersChanged = () => {
        const listWorkers = Object.values(workers);
        let items = listWorkers.map(worker => ({
            pid: worker.process.pid,
            primaryWorker: worker.primaryWorker,
            status: worker.status,
            version: process.env.version,
            imageInfo: worker.imageInfo,
            createdDate: worker.createdDate
        }));
        listWorkers.forEach(worker => {
            !worker.isDead() && worker.send({ type: 'workersChanged', workers: items });
        });
    };


    cluster.on('exit', (worker, code, signal) => {
        console.log(` - Worker #${worker.process.pid} died with code: ${code}, and signal: ${signal}. Starting a new worker!`);
        if (code != 4) {
            const { primaryWorker, status } = workers[worker.process.pid];
            delete workers[worker.process.pid];
            if (status == 'resetting' || status == 'running') {
                worker = cluster.fork({ primaryWorker });
                worker.primaryWorker = primaryWorker;
                worker.status = 'running';
                worker.version = process.env.version;
                worker.createdDate = new Date();
                workers[worker.process.pid] = worker;
            }
        }
        workersChanged();
    });

    cluster.on('online', (worker) => {
        console.log(` - Worker #${worker.process.pid} is online.`);
        worker.on('message', (msg) => {
            const targetWorker = workers[msg.workerId];
            switch (msg.type) {
                case 'createWorker':
                    targetWorker.status = 'resetting';
                    targetWorker.send({ type: message.type });
                    break;
                case 'resetWorker':
                    targetWorker.status = 'resetting';
                    targetWorker.send({ type: message.type });
                    break;
                case 'shutdownWorker':
                    targetWorker.status = 'shutdown';
                    targetWorker.send({ type: message.type });

                    delete workers[message.workerId];
                    const listWorkers = Object.values(workers);
                    listWorkers.length && listWorkers[0].send({ type: 'setPrimaryWorker' });
                default:
                    break;
            }
            workersChanged();

        });
    });

    return { cluster, workers };
}