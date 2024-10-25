const fwRoleController = (app) => {
    // const menu = {
    //     parentMenu: app.parentMenu.setting,
    //     menus: {
    //         2020: { title: 'Vai trò', link: '/user/role' }
    //     }
    // }

    app.permission.add({ name: 'role:read' }, { name: 'role:write' }, { name: 'role:delete' });

    app.get('/api/role/all-permissions', async (req, res) => {
        try {
            const allPermissions = app.permission.all();
            res.send({ allPermissions });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });
    app.get('/api/role/all', async (req, res) => {
        try {
            const items = await app.model.fwRole.getAll();
            if (items) {
                items.forEach(item => {
                    item.permission = item.permission ? item.permission.split(',') : [];
                });
            }
            res.send({ items });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });
    app.get('/api/role/:id', async (req, res) => {
        try {
            const item = await app.model.fwRole.get({ id: req.params.id });
            if (item) {
                item.permission = item.permission ? item.permission.split(',') : [];
            }
            res.send({ item });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });
    app.post('/api/role', async (req, res) => {
        try {
            const data = req.body;
            data.permission && (data.permission = data.permission.join(','));
            const item = await app.model.fwRole.create(req.body);
            res.send({ item });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });
    app.put('/api/role', async (req, res) => {
        try {
            const { id, changes } = req.body;
            if (changes.permission) {
                changes.permission = changes.permission.join(',');
            }
            const item = await app.model.fwRole.update({ id }, changes);
            res.send({ item });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    })
}

export default fwRoleController;