import crypt from 'bcrypt';


const fwUserManual = app => {

    app.model.fwUser.equalPassword = (password, confirmPassword) => {
        return crypt.compareSync(password, confirmPassword);
    }

    app.model.fwUser.hashPassword = (password) => {
        return crypt.hashSync(password, crypt.genSaltSync(8));
    }

    app.model.fwUser.auth = async (email, password) => {
        const user = await app.model.fwUser.get({ email });
        if (user) {
            if (app.model.fwUser.equalPassword(password, user.password)) {
                return user;
            }
        }
        return null;
    };
}

export default fwUserManual;