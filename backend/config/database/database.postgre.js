import { Sequelize, DataTypes, Op } from 'sequelize';
class BaseModel {
    constructor({ app, model, modelName, obj2Db, connection, parseParameters }) {
        this.app = app;
        this.model = model;
        this.obj2Db = obj2Db;
        this.modelName = modelName;
        this.connection = connection;
        this.parseParameters = parseParameters
    }

    async create(data) {
        try {
            const parseData = this.app.database.postgres.parseToDbColumns(this.obj2Db, data);
            let item = await this.model.create(parseData);
            item = this.app.database.postgres.parseToStandardColumns(this.obj2Db, item.toJSON());
            return item;
        } catch (error) {
            console.error(`${this.modelName} create: `, error);
            throw error;
        }
    }

    async bulkCreate(data) {
        try {
            const parseData = data.map(item => this.app.database.postgres.parseToDbColumns(this.obj2Db, item));
            let items = await this.model.bulkCreate(parseData);
            return items.map(item => this.app.database.postgres.parseToStandardColumns(this.obj2Db, item.toJSON()));
        } catch (error) {
            console.error(`${this.modelName} bulkCreate: `, error);
            throw error;
        }
    }

    async get(condition = {}, selectedColumns = '*', orderBy = null) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            const attributes = this.app.database.postgres.buildAttribute(this.obj2Db, selectedColumns);
            const order = this.app.database.postgres.buildOrderBy(this.obj2Db, orderBy);
            return await this.model.findOne({ where: parsedCondition, attributes, order, raw: true });
        } catch (error) {
            console.error(`${this.modelName} get: `, error);
            throw error;
        }
    }

    async getAll(condition = {}, selectedColumns = '*', orderBy = null) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            const attributes = this.app.database.postgres.buildAttribute(this.obj2Db, selectedColumns);
            const order = this.app.database.postgres.buildOrderBy(this.obj2Db, orderBy);
            return await this.model.findAll({ where: parsedCondition, attributes, order, raw: true });
        } catch (error) {
            console.error(`${this.modelName} getAll: `, error);
            throw error;
        }
    }

    async getPage(pageNumber, pageSize, condition = {}, selectedColumns = '*', orderBy = null) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            const attributes = this.app.database.postgres.buildAttribute(this.obj2Db, selectedColumns);
            const order = this.app.database.postgres.buildOrderBy(this.obj2Db, orderBy);
            const totalItem = await this.model.count({ where: parsedCondition });
            const page = { totalItem, pageSize, pageTotal: Math.ceil(totalItem / pageSize) };
            page.pageNumber = Math.max(1, Math.min(pageNumber, page.pageTotal));
            const skip = Math.max(0, page.pageNumber - 1) * pageSize;
            page.list = await this.model.findAll({ where: parsedCondition, attributes, order, raw: true, offset: skip, limit: pageSize });
            return page;
        } catch (error) {
            console.error(`${this.modelName} getPage: `, error);
            throw error;
        }
    }

    async update(condition, changes) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            const parsedChanges = this.app.database.postgres.parseToDbColumns(this.obj2Db, changes);
            if (parsedChanges.error) throw parsedChanges.error;
            const result = await this.model.update(parsedChanges, { where: parsedCondition, returning: true, raw: true });
            const item = result && result[1] || [];
            return item && item.length ? (item.length == 1 ? this.app.database.postgres.parseToStandardColumns(this.obj2Db, item[0]) : item.map(i => this.app.database.postgres.parseToStandardColumns(this.obj2Db, i))) : null;
        } catch (error) {
            console.error(`${this.modelName} update: `, error);
            throw error;
        }
    }

    async delete(condition = {}) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            await this.model.destroy({ where: parsedCondition });
        } catch (error) {
            console.error(`${this.modelName} delete: `, error);
            throw error;
        }
    }

    async count(condition = {}) {
        try {
            const parsedCondition = this.app.database.postgres.buildCondition(this.obj2Db, condition);
            if (parsedCondition.error) throw parsedCondition.error;
            return await this.model.count({ where: parsedCondition });
        } catch (error) {
            console.error(`${this.modelName} count: `, error);
            throw error;
        }
    }

}

export async function connect_postgres(app) {

    const { PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE } = process.env;
    const pgUrl = `postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
    const sequelize = new Sequelize(pgUrl, {
        logging: false,
        define: {
            freezeTableName: true,
            timestamps: false,
            createdAt: false,
            updatedAt: false
        }
    });

    app.database.postgre = sequelize;
    app.sequelize = { obj2Db: {} };
    app.database.postgre.authenticate()
        .then(() => console.log(` - #${process.pid}: The Postgre connection succeeded.`))
        .catch(error => console.log(` - #${process.pid}: The Postgre connection failed!`, error.message));


    app.database.postgres = {
        sequelize,
        DataTypes,
        Op,
        BaseModel,
        genObj2Db: (schema) => {
            const obj2Db = {};

            Object.keys(schema).forEach(fieldName => {
                const standardName = fieldName
                    .split('_')
                    .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join('');
                obj2Db[standardName] = fieldName;
            });

            return obj2Db;
        },

        parseToDbColumns: (mapper, data = {}) => {
            const parseData = {};
            Object.entries(data).forEach(([key, value]) => {
                if (mapper[key]) {
                    parseData[mapper[key]] = value === '' ? null : value;
                }
            });
            return parseData;
        },

        parseToStandardColumns: (mapper, data = {}) => {
            if (!data) return null;
            const parseData = {};
            Object.entries(mapper).forEach(([standardField, dbField]) => {
                if (data[dbField] !== undefined) parseData[standardField] = data[dbField];
            });
            return parseData;
        },

        buildAttribute: (mapper, selectedColumns) => {
            if (selectedColumns == '*') { // All columns
                return Object.keys(mapper).map(key => ([mapper[key], key]));
            } else {
                const finalSelectColumns = selectedColumns.split(',').map(column => (column || '').trim());
                const attributes = [];
                for (const column of finalSelectColumns) {
                    if (mapper[column]) {
                        attributes.push([mapper[column], column]);
                    }
                }
                return attributes;
            }
        },

        buildOrderBy: (mapper, orderBy) => {
            if (!orderBy) return [];
            return orderBy.split(',').map(item => {
                let [field, direction] = (item || '').trim().split(' ');
                if (direction) direction = direction.toUpperCase();
                if (!direction || direction != 'DESC') direction = 'ASC';
                return mapper[field] ? [mapper[field], direction] : null;
            }).filter(item => !!item);
        },

        buildCondition: (mapper, condition) => {
            // Nếu condition không phải Object JSON, nghĩa là có giá trị xác định (number, string, boolean, ...) trả về condition
            if (typeof condition !== 'object') return condition;
            // and or _ in notIn    like iLike notLike notILike  gt gte lt lte between    eq ne
            let where = {};
            const keys = Object.keys(condition);
            for (const key of keys) {
                if (key === 'or') {
                    if (!Array.isArray(values)) {
                        return { error: 'Invalid condition: The value of OR condition must be an array!' };
                    }
                    if (values.some(value => typeof condition !== 'object')) {
                        return { error: 'Invalid condition: The value of OR condition must be an object!' };
                    }
                    const subConditions = values.map(value => app.database.postgres.buildCondition(mapper, value));
                    const error = subConditions.find(subCondition => subCondition.error);
                    if (error) return error;
                    where[Op.or] = subConditions;
                } else if (key === 'and') {
                    if (!Array.isArray(values)) {
                        return { error: 'Invalid condition: The value of AND condition must be an array! Eg: <column: { and: [1,2,3] } >' };
                    }
                    const subConditions = values.map(value => app.database.postgres.buildCondition(mapper, value));
                    const error = subConditions.find(subCondition => subCondition.error);
                    if (error) return error;
                    where[Op.and] = subConditions;
                } else if (['between', 'in', 'notIn'].includes(key)) {
                    if (!Array.isArray(values)) {
                        return { error: `Invalid condition: The value of ${key.toUpperCase()} condition must be an array!` };
                    }
                    if (values.some(value => typeof value === 'object')) {
                        return { error: `Invalid condition: The value of ${key.toUpperCase()} condition must be a determined value!` };
                    }
                    where[Op[key]] = values;
                } else if (['like', 'iLike', 'notLike', 'notILike', 'gt', 'gte', 'lt', 'lte', 'eq', 'ne'].includes(key)) {
                    if (Array.isArray(values) || typeof values === 'object') {
                        return { error: `Invalid condition: The value of ${key.toUpperCase()} condition must be a determined value!` };
                    }
                    where[Op[key]] = values;
                } else if (mapper[key]) {
                    const dbKey = mapper[key];
                    const value = condition[key] === '' ? null : condition[key];

                    if (Array.isArray(value)) {
                        if (value.some(_value => typeof _value === 'object')) {
                            return { error: `Invalid condition: The value of ${key.toUpperCase()} condition must be a determined value!` };
                        }
                        where[dbKey] = { [Op.in]: value };
                    } else if (value && typeof value === 'object') {
                        if (value.hasOwnProperty('and') || value.hasOwnProperty('or')) {
                            return { error: `Invalid condition: Invalid clause of ${key}, not accept and|or!` };
                        }
                        const dbKeyCondition = app.database.postgres.buildCondition(mapper, value);
                        if (dbKeyCondition.error) return dbKeyCondition;
                        where[dbKey] = dbKeyCondition;
                    } else {
                        where[dbKey] = value;
                    }
                } else {
                    return { error: `Invalid condition: ${key} is not a name of column!` };
                }
            }
            return where;
        },

        parseParameters: (queryParameter, ...fieldNames) => {
            const params = [];
            let s = '';
            let inString = false;

            for (let i = 0; i < queryParameter.length; i++) {
                const currentText = queryParameter[i];

                if (currentText === '"') {
                    if (inString) {
                        const nextText = queryParameter[i + 1];
                        if (nextText === '"') {
                            s += '"';
                            i++;
                        } else {
                            params.push(s);
                            inString = false;
                            s = '';
                        }
                    } else {
                        s = '';
                        inString = true;
                    }
                    continue;
                }

                if (currentText === ',' && inString) {
                    s += currentText;
                    continue;
                }

                if (currentText === ',' && !inString) {
                    if (s) {
                        params.push(s === 't' ? true : s === 'f' ? false : isNaN(s) ? s : Number(s));
                        s = '';
                    }
                    continue;
                }

                s += currentText;
            }

            if (s) {
                params.push(s === 't' ? true : s === 'f' ? false : isNaN(s) ? s : Number(s));
            }

            return fieldNames.reduce((result, field, index) => {
                result[field] = params[index];
                return result;
            }, {});
        }
    };

}