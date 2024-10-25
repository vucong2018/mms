const fwRole = app => {
    const { DataTypes, BaseModel, sequelize: connection, genObj2Db } = app.database.postgres;

    const schema = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: DataTypes.STRING(100),
        permission: DataTypes.TEXT,
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        description: DataTypes.STRING(500)
    };

    const modelName = 'FwRole';
    const tableName = 'fw_role';
    const methods = {};

    const model = connection.define('fw_role', schema);
    const obj2Db = genObj2Db(schema);
    class FwRole extends BaseModel {

    }

    app.model.fwRole = new FwRole({ app, model, modelName, obj2Db, connection })

    return { schema, methods, tableName };
};
export default fwRole;
