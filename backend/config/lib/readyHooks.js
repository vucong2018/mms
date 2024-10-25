
export function readyHooks_lib(app) {
    // Ready hook ------------------------------------------------------------------------------------------------------
    const readyHookContainer = {};
    let readyHooksId = null;
    app.readyHooks = {
        add: (name, hook) => {
            if (hook.ready()) {
                hook.run();
            } else {
                readyHookContainer[name] = hook;
            }
            app.readyHooks.waiting();
        },
        remove: name => {
            readyHookContainer[name] = null;
            delete readyHookContainer[name];
        },
        waiting: () => {
            if (readyHooksId) clearTimeout(readyHooksId);
            readyHooksId = setTimeout(app.readyHooks.run, 2000);
        },
        run: () => {
            let hookKeys = Object.keys(readyHookContainer), ready = true;

            hookKeys.forEach(hookKey => {
                if (readyHookContainer[hookKey].ready()) {
                    readyHookContainer[hookKey].run();
                    app.readyHooks.remove(hookKey);
                } else {
                    ready = ready && false;
                }
            });
            if (ready) {
                console.log(` - #${process.pid}${app.primaryWorker ? ' (primary)' : ''}: The system is ready!`);
            } else {
                app.readyHooks.waiting();
            }
        }
    };
    app.readyHooks.waiting();

}