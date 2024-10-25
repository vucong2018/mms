export function uploadHooks_lib(app) {
    const uploadHooksContainer = {};
    app.uploadHooks = {
        add: (name, hook) => {
            uploadHooksContainer[name] = hook;
        },
        run: (name, req, res, files) => {
            if (!uploadHooksContainer[name]) {
                console.error(`Upload hook ${name} not found!`);
                res.status(500).send({ message: `Upload hook ${name} not found!` });
            }
            else uploadHooksContainer[name](req, res, files, () => { res.status(403).send({ message: 'you do not have permissions' }); });
        }
    };
}