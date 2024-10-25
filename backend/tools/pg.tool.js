import dotenv from 'dotenv';
import { Sequelize, QueryTypes } from 'sequelize';
dotenv.config();

export class PostgresTool {
    sequelize = null;
    connect = async () => {
        const { PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE } = process.env;
        const pgUrl = `postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
        this.sequelize = new Sequelize(pgUrl, {
            logging: false,
            define: {
                freezeTableName: true,
                timestamps: false,
                createdAt: false,
                updatedAt: false
            }
        });

        try {
            await this.sequelize.authenticate();
            console.log(` - #${process.pid}: The Postgre connection succeeded.`);
            return this.sequelize;
        } catch (error) {
            console.log(` - #${process.pid}: The Postgre connection failed!`, error.message);
        }
    }

    getDatabaseObjects = async () => {
        if (this.sequelize) {
            // Get all tables
            const tableSql = 'SELECT relname as \"name\" FROM pg_class WHERE relname !~ \'^(pg_|sql_)\' AND relkind = \'r\' ORDER BY relname;';
            const tables = await this.sequelize.query(tableSql, { type: QueryTypes.SELECT });

            // Get all functions
            const functionSql = 'SELECT routine_name as \"name\" FROM information_schema.routines WHERE specific_schema NOT IN (\'pg_catalog\', \'information_schema\') AND type_udt_name != \'trigger\' ORDER BY routine_name;';
            const functions = await this.sequelize.query(functionSql, { type: QueryTypes.SELECT });

            return ({
                table: tables.map(table => table.name),
                function: functions.map(func => func.name)
            });
        } else {
            console.log(` - #${process.pid}: The Postgre must be connect first!`);
            process.exit(1);
        }


    }

    getColumns = async () => {
        const { PG_DATABASE } = process.env;
        console.log('   + Read columns');
        const sql = `SELECT 
                        column_name as "columnName", 
                        column_default as "columnDefault", 
                        is_nullable as "isNullable", 
                        character_maximum_length as "characterMaximumLength",
                        numeric_precision as "numericPrecisionRadix",
                        numeric_scale as "numericScale",
                        udt_name as "udtName", 
                        table_name as "tableName"
                     FROM information_schema.columns
                     WHERE table_catalog = '${PG_DATABASE}' and table_schema NOT IN ('pg_catalog', 'information_schema')
                     ORDER BY table_name, ordinal_position;`;
        const columns = await this.sequelize.query(sql, { type: QueryTypes.SELECT }), primaryKeys = {};
        console.log('   + Read primary keys');
        const primarySql = `SELECT pg_attribute.attname as "attName", pg_class.relname as "relName"
                            FROM pg_index, pg_class, pg_attribute, pg_namespace
                            WHERE indrelid = pg_class.oid
                              AND nspname = 'public'
                              AND pg_class.relnamespace = pg_namespace.oid
                              AND pg_attribute.attrelid = pg_class.oid
                              AND pg_attribute.attnum = any (pg_index.indkey)
                              AND indisprimary;`
        const primaries = await this.sequelize.query(primarySql, { type: QueryTypes.SELECT });
        primaries.forEach(primary => {
            if (primaryKeys[primary.relName]) primaryKeys[primary.relName].push(primary.attName);
            else primaryKeys[primary.relName] = [primary.attName];
        });
        return { columns, primaryKeys };
    }

    getMethodArguments = async () => {
        const sql = `select n.nspname                        as "functionSchema",
                            p.proname                        as "functionName",
                            case
                                when l.lanname = 'internal' then p.prosrc
                                else pg_get_functiondef(p.oid)
                                end                          as "definition",
                            pg_get_function_arguments(p.oid) as "functionArguments"
                     from pg_proc p
                              left join pg_namespace n on p.pronamespace = n.oid
                              left join pg_language l on p.prolang = l.oid
                              left join pg_type t on t.oid = p.prorettype
                     where n.nspname not in ('pg_catalog', 'information_schema')
                     order by "functionSchema",
                              "functionName";`;
        const result = await this.sequelize.query(sql, { type: QueryTypes.SELECT }) || [];
        const resultMapper = {};
        result.forEach(func => resultMapper[func.functionName] = func);
        return resultMapper;
    }

}
