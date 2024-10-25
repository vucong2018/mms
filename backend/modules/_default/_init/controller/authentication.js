import jwt from 'jsonwebtoken';

export default (app) => {
    const jwtSecret = '9FORRVkr8vWOKE8qKdymuCTBbKvrUfqPHlWbr7J2qlfgvchiigD0h9y7nAd3gjowdStAoqMqe7P5ew9kHtodkg==';
    const jwtExpiresIn = '7d';

    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            if (req.session.user) {
                if (req.session.user.email == email) {
                    res.send({ user: req.session.user });
                } else {
                    res.send({ error: 'Bạn đã đăng nhập bằng 1 tài khoản khác!' });
                }
            }
            else {
                const user = await app.model.fwUser.auth(email, password);
                if (user == null || user == undefined) {
                    res.send({ error: 'Email hoặc mật khẩu không đúng!' });
                }
                else if (user) {
                    // user.token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });
                    const sessionUser = await app.updateSessionUser(req, user);
                    res.send({ user: sessionUser });
                }
                else {
                    res.send({ error: 'Tài khoản của bạn chưa được kích hoạt!' });
                }
            }
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });

    app.post('/api/auth/logout', async (req, res) => {
        try {
            if (app.isDebug) res.clearCookie('choli_session');
            req.session.destroy();
            app.io.to(`user:${req.session.user.id}`).emit('Logout', { lastLogin: req.session.user.lastLogin });
            req.session.user = null;
            res.send({ error: null });
        }
        catch (e) {
            console.error(e);
            res.send({ error: 'Hệ thống bị lỗi' });
        }
    });
}
