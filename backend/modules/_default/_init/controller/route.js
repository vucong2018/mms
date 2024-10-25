const Routes = (app) => {
    app.get('/api/menu', async (req, res) => {
        const menu = app.permission.tree();
        res.send({ menu });
    })

    app.get('/api/system/state', async (req, res) => {
        try {
            const data = await app.state.get();
            if (data == null) {
                res.send({ error: 'System has error!' });
            } else {
                Object.keys(data).forEach(key => {
                    if (key.toLowerCase().indexOf('password') != -1) delete data[key];
                });
                if (app.isDebug) data.isDebug = true;
                if (req.session.user) data.user = req.session.user;
                res.send(data);
            }
        } catch (error) {
            console.error('Error getting system state:', error);
            res.send({ error: 'Error getting system state' });
        }
    });

    app.get('/api/test/session', async (req, res) => {
        console.log('req.session', req.session);
        res.send({ session: req.session });
    });
}

export default Routes;