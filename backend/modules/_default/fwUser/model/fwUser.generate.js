const fwUser = app => {
    const { DataTypes, BaseModel, sequelize: connection, genObj2Db } = app.database.postgres;

    const schema = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        last_name: DataTypes.STRING(200),
        first_name: DataTypes.STRING(100),
        image: DataTypes.STRING(200),
        password: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        is_staff: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_shareholder: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        cmnd_cccd: {
            type: DataTypes.STRING(20),
            defaultValue: ''
        },
        dia_chi: {
            type: DataTypes.STRING(1000),
            defaultValue: ''
        },
        so_dien_thoai: {
            type: DataTypes.STRING(20),
            defaultValue: ''
        },
        so_co_phan: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        so_co_phan_in: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        ma_co_phan: DataTypes.STRING(10),
        xac_nhan_tham_gia_dai_hoi: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        duoc_uy_quyen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        cmnd_cccd_noi_cap: {
            type: DataTypes.TEXT,
            defaultValue: ''
        },
        cmnd_cccd_ngay_cap: DataTypes.BIGINT,
        token: DataTypes.STRING(2000),
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    };

    const modelName = 'FwUser';
    const tableName = 'fw_user';
    const methods = {
        'fw_user_get_user_roles': 'getUserRoles'
    };

    const model = connection.define('fw_user', schema);
    const obj2Db = genObj2Db(schema);
    class FwUser extends BaseModel {


        async getUserRoles(pEmail) {
            const t = await this.connection.transaction();
            try {
                let queryParameter = await this.connection.query('select fw_user_get_user_roles(\'call_result\', :pEmail);', { replacements: { pEmail }, raw: true, transaction: t });
                let queryResult = await this.connection.query('fetch all in call_result;', { raw: true, transaction: t });
                queryParameter = queryParameter[0][0]['fw_user_get_user_roles'];
                queryParameter = queryParameter.substring(1, queryParameter.length - 1);
                queryResult = queryResult[0];
                const result = this.app.database.postgres.parseParameters(queryParameter);
                result.list = queryResult;
                await t.commit();
                return result;
            } catch (error) {
                console.error('fwUser getUserRoles', error);
                await t.rollback();
                throw error;
            }
        }

    }

    app.model.fwUser = new FwUser({ app, model, modelName, obj2Db, connection })

    return { schema, methods, tableName };
};
export default fwUser;
