export default (app) => {
    // const menu = {
    //     parentMenu: app.parentMenu.setting,
    //     menus: {
    //         2010: { title: 'Người dùng', link: '/user/nhan-su' }
    //     }
    // }

    app.permission.add({ name: 'user:read' }, { name: 'user:write' }, { name: 'user:delete' });

    app.get('/api/user', app.middleware.permissionCheck('user:read'), async (req, res) => {
        try {
            const orderBy = 'id ASC';
            const users = await app.model.fwUser.getAll({}, '*', orderBy);
            res.send({ users, cookie: req.headers.cookie, user: req.session.user });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });

    app.post('/api/user', async (req, res) => {
        try {
            const { username, password, email, role } = req.body;
            if (!username || !password || !email || !role) throw 'Gửi thiếu dữ liệu';

            const newUser = await app.model.fwUser.create({ username, password, email, role });
            res.send({});
        } catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });

    app.put('/api/user', async (req, res) => {
        try {
            const dataChange = req.body;
            const userId = req.body.id;
            if (!userId) {
                return res.status(400).send({ error: 'User ID is required' });
            }
            const user = await app.model.fwUser.update({ id: userId }, dataChange);
            res.send(user);
        } catch (e) {
            console.error(e);
            res.status(500).send({ error: 'Hệ thống bị lỗi' });
        }
    });

    app.delete('/api/user', async (req, res) => {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).send({ error: 'User ID is required' });
            }
            const user = await app.model.fwUser.destroy({ where: { id } });
            res.send(user);
        } catch (e) {
            console.error(e);
            res.status(500).send({ error: 'Hệ thống bị lỗi' });
        }
    });
};