import { PostgresTool } from "./pg.tool.js";
import fs from 'fs';
import path from 'path';
import { DataTypes } from 'sequelize';
const argv = process.argv;
const database = new PostgresTool();
const targetProjectDir = process.cwd();
const tables = argv[3]?.split(',').map(item => item.trim().toLowerCase());
String.prototype.replaceAll = function (search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

String.prototype.upFirstChar = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

const osvar = process.platform;
let prefixFilePath = ''
if (osvar.includes('win')) prefixFilePath = `file://`;

async function genDb() {
    const connection = await database.connect();
    const fakeApp = {
        model: {},
        sequelize: { obj2Db: {} },
        database: {
            postgres: {
                DataTypes,
                sequelize: connection,
                genObj2Db: () => { },
                BaseModel: class FakeBaseModel { }
            }
        }
    };
    const app = {
        fs,
        path,
        createFolder: function () {
            for (let i = 0; i < arguments.length; i++) !app.fs.existsSync(arguments[i]) && app.fs.mkdirSync(arguments[i]);
        },
        dataTypeMapper: (type) => {
            switch (type) {
                case 'int4': return 'DataTypes.INTEGER';
                case 'int8': return 'DataTypes.BIGINT';
                case 'float4': return 'DataTypes.REAL';
                case 'varchar': return 'DataTypes.STRING';
                case 'text': return 'DataTypes.TEXT';
                case 'bool': return 'DataTypes.BOOLEAN';
                case 'jsonb': return 'DataTypes.JSONB';
                case 'numeric': return 'DataTypes.DECIMAL';
                case 'geometry': return 'DataTypes.GEOMETRY';
                default: return 'undefined';
            }
        },
        normalName: name => {
            name = name.toLowerCase();
            return name.split('_').map((word, index) => index == 0 ? word : word.upFirstChar()).join('');
        },
        modelName: name => {
            name = name.toLowerCase();
            return name.split('_').map(word => word.upFirstChar()).join('');
        },
        targetProjectDir: process.cwd(),
    }
    const databaseObjects = await database.getDatabaseObjects();
    const dbTables = {};
    (databaseObjects.table || []).forEach(_table => {
        if (tables.includes(_table)) {
            dbTables[_table] = {};
        }
    });

    // Lấy file generate.js hiện tại
    const currentTables = {};

    const modelFiles = app.fs.readdirSync(path.join(app.targetProjectDir, 'modules'), { recursive: true, withFileTypes: true })
    for (const item of modelFiles) {
        if (item.isFile() && item.name.endsWith('generate.js')) {
            const modelPath = app.path.normalize(item.path);
            const data = await import(`${prefixFilePath}${app.path.join(modelPath, item.name)}`).then(i => i.default(fakeApp));
            const modelName = item.name.replace('.generate.js', '');
            currentTables[modelName] = {
                schema: data && data.schema || null,
                methods: data && data.methods || null,
                modelPath,
            }
        }
    }
    const { columns, primaryKeys } = await database.getColumns();
    const methodDefinition = await database.getMethodArguments();

    columns.forEach(column => {
        if (dbTables[column.tableName]) {
            const primaryList = primaryKeys[column.tableName] || [];
            dbTables[column.tableName][column.columnName] = {
                type: column.udtName,
                length: column.characterMaximumLength,
                numericPrecisionRadix: column.numericPrecisionRadix,
                numericScale: column.numericScale,
                isNullable: column.isNullable.toLowerCase() == 'yes',
                isPrimary: primaryList.includes(column.columnName),
                autoIncrement: !!(column.columnDefault && column.columnDefault.includes('nextval(')),
                defaultValue: column.columnDefault && column.columnDefault.includes('nextval(') ? null : column.columnDefault
            }
        }
    });
    // return;
    Object.keys(dbTables).forEach(tableName => {
        const normalName = app.normalName(tableName);
        const modelName = app.modelName(tableName);
        const currentTable = currentTables[normalName];
        let modelPath = currentTable.modelPath;


        let schemaText = `const schema = {
        `;
        let countColumns = Object.keys(dbTables[tableName]).length;
        Object.entries(dbTables[tableName]).forEach(([columnName, column], index) => {
            let defineText;
            if (column.isNullable && !column.isPrimary && !column.autoIncrement && !column.defaultValue) {
                let typeLength = '';

                if (column.length != null) {
                    typeLength = '(' + column.length + ')';
                }
                if (column.type == 'numeric' && column.numericPrecisionRadix) {
                    typeLength = '(' + column.numericPrecisionRadix;

                    if (column.numericScale) {
                        typeLength += ', ' + column.numericScale + ')';
                    } else {
                        typeLength += ')';
                    }
                }
                defineText = `        ${columnName}: ${app.dataTypeMapper(column.type)}${typeLength}${index == countColumns - 1 ? '\n' : ',\n'}`;
            } else {
                let typeLength = '';

                if (column.length != null) {
                    typeLength = '(' + column.length + ')';
                }
                if (column.type == 'numeric' && column.numericPrecisionRadix) {
                    typeLength = '(' + column.numericPrecisionRadix;

                    if (column.numericScale) {
                        typeLength += ', ' + column.numericScale + ')';
                    } else {
                        typeLength += ')';
                    }
                }
                defineText = `${index == 0 ? '' : '        '}${columnName}: {
            type: ${app.dataTypeMapper(column.type)}${typeLength}`;
                if (column.autoIncrement) {
                    defineText += `,
            autoIncrement: true`;
                }
                if (column.isPrimary) {
                    defineText += `,
            primaryKey: true`;
                }
                if (!column.isNullable && !column.isPrimary) {
                    defineText += `,
            allowNull: false`;
                }
                if (column.defaultValue) {
                    let defaultValue = column.defaultValue;
                    if (column.type == 'varchar') defaultValue = defaultValue.replace('::character varying', '');
                    if (column.type == 'jsonb') defaultValue = defaultValue.replace('::jsonb', '');
                    if (column.type == 'text') defaultValue = defaultValue.replace('::text', '');
                    if (defaultValue.includes('::integer')) {
                        defaultValue = defaultValue.replace('::integer', '');
                        defaultValue = defaultValue.replaceAll('\'', '');
                    }
                    if (column.type == 'geometry') defaultValue = defaultValue.replace('::geometry', '');
                    defineText += `,
            defaultValue: ${defaultValue}`;
                }
                defineText += `\n        }${index == countColumns - 1 ? '\n' : ',\n'}`
            }
            schemaText += defineText;
        });
        schemaText += '    };';

        let methodText = `const methods = {`, methodFunc = '';
        const methods = currentTable ? currentTable.methods : null;
        if (!methods || !Object.keys(methods).length) methodText += '};';
        else {
            methodText += '\n';
            Object.entries(methods).forEach(([funcName, funcCall], index, a) => {
                methodText += `        '${funcName}': '${funcCall}'${index != a.length - 1 ? ',' : ''}\n`;
                const definition = methodDefinition[funcName];
                if (definition) {
                    // if (!methodFunc) methodFunc += ',';
                    const listArguments = definition.functionArguments.replaceAll('\'', '').replaceAll('refcursor', '').split(',').map(item => (item || '').trim()).filter(item => !!item);
                    const inParam = [], outParam = [];
                    listArguments.forEach(arg => {
                        let [inOutInfo, parameter, typeValue] = arg.split(' ');
                        if (!['INOUT', 'IN', 'OUT'].includes(inOutInfo.toUpperCase())) {
                            typeValue = parameter;
                            parameter = inOutInfo;
                            inOutInfo = 'IN';
                        }
                        if (inOutInfo.toUpperCase() == 'INOUT') {
                            parameter && inParam.push(app.normalName(parameter));
                            parameter && outParam.push(app.normalName(parameter));
                        }
                        if (inOutInfo.toUpperCase() == 'IN') {
                            parameter && inParam.push(app.normalName(parameter));
                        }
                        if (inOutInfo.toUpperCase() == 'OUT') {
                            parameter && outParam.push(app.normalName(parameter));
                        }
                    });
                    let text = `

        async ${funcCall} (${inParam.join(', ')}) {
            const t = await this.connection.transaction();
            try {
                let queryParameter = await this.connection.query('select ${funcName}(\\'call_result\\'${inParam.length ? ', ' : ''}${inParam.map(i => ':' + i).join(', ')});', { replacements: { ${inParam.join(', ')} }, raw: true, transaction: t });
                let queryResult = await this.connection.query('fetch all in call_result;', { raw: true, transaction: t });
                queryParameter = queryParameter[0][0]['${funcName}'];
                queryParameter = queryParameter.substring(1, queryParameter.length - 1);
                queryResult = queryResult[0];
                const result = this.app.database.postgres.parseParameters(queryParameter${outParam.length ? ', ' : ''}${outParam.map(i => '\'' + i + '\'').join(', ')});
                result.list = queryResult;
                await t.commit();
                return result;
            } catch (error) {
                console.error('${normalName} ${funcCall}', error);
                await t.rollback();
                throw error;
            }
        }
            `;
                    methodFunc += text;
                }
            });
            methodText += '    };';
        }
        const data = `const ${normalName} = app => {
    const { DataTypes, BaseModel, sequelize: connection, genObj2Db } = app.database.postgres;

    ${schemaText}

    const modelName = '${modelName}';
    const tableName = '${tableName}';
    ${methodText}

    const model = connection.define('${tableName}', schema);
    const obj2Db = genObj2Db(schema);
    class ${modelName} extends BaseModel {
        ${methodFunc}
    }

    app.model.${normalName} = new ${modelName}({ app, model, modelName, obj2Db, connection})

    return { schema, methods, tableName };
};
export default ${normalName};
`;

        try {
            app.fs.writeFileSync(app.path.join(modelPath, normalName + '.generate.js'), data);
        } catch (error) {
            console.error(error);
        }
    });
    console.log('   + Generate done!');
}

await genDb();
process.exit();