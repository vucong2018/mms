import crypt from 'bcryptjs';

export function until_general(app) {
    app.utils = {
        ...app.utils,
        general: {
            ...until_general
        }
    };

    equalPassword = (password, confirmPassword) => {
        return crypt.compareSync(password, confirmPassword);
    }

    hashPassword = (password) => {
        return crypt.hashSync(password, crypt.genSaltSync(8));
    }

}
