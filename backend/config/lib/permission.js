Array.prototype.contains = function (pattern) {
    return pattern.reduce((result, item) => result && this.includes(item), true);
};

Array.prototype.exists = function (pattern, req) {
    return pattern.reduce((result, item) => result || this.includes(item), false);
};



export function permission_lib(app) {
    const checkPermissions = (req, res, next, permissions) => {
        if (req.session.user) {
            const user = req.session.user;
            if (user.permissions && user.permissions.contains(permissions)) {
                next();
            } else if (permissions.length == 0) {
                next();
            } else {
                responseError(req, res);
            }
        } else {
            responseError(req, res);
        }
    };

    const checkOrPermissions = (req, res, next, permissions) => {
        if (req.session.user) {
            const user = req.session.user;
            if (user.permissions && user.permissions.exists(permissions, req)) {
                next();
            } else if (permissions.length == 0) {
                next();
            } else {
                responseError(req, res);
            }
        } else {
            responseError(req, res);
        }
    };

    const responseError = (req, res) => {
        if (req.method.toLowerCase() === 'get') { // is get method
            if (req.originalUrl.startsWith('/api')) {
                res.send({ error: req.session.user ? 'request-permissions' : 'request-login' });
            } else {
                res.redirect(req.session.user ? '/request-permissions' : '/request-login');
            }
        } else {
            res.send({ error: 'You don\'t have permission!' });
        }
    };
    const responseWithPermissions = (req, success, fail, permissions) => {
        if (req.session.user) {
            if (req.session.user.permissions && req.session.user.permissions.contains(permissions)) {
                success();
            } else {
                fail && fail();
            }
        } else if (permissions.length == 0) {
            success();
        } else {
            fail && fail();
        }
    };
    app.clone = function () {
        const length = arguments.length;
        let result = null;
        if (length && Array.isArray(arguments[0])) {
            result = [];
            for (let i = 0; i < length; i++) {
                result = result.concat(arguments[i]);
            }
        } else if (length && typeof arguments[0] == 'object') {
            result = {};
            for (let i = 0; i < length; i++) {
                const obj = JSON.parse(JSON.stringify(arguments[i]));
                Object.keys(obj).forEach(key => result[key] = obj[key]);
            }
        }
        return result;
    };
    const systemPermission = [];
    const menuTree = {};
    app.permission = {
        all: () => [...systemPermission],

        tree: () => {
            return app.clone(menuTree)
        },

        add: (...permissions) => {
            permissions.forEach(permission => {
                if (typeof permission == 'string') {
                    permission = { name: permission };
                } else if (permission.menu) {
                    if (permission.menu.parentMenu) {
                        const { index, subMenusRender } = permission.menu.parentMenu;
                        if (menuTree[index] == null) {
                            menuTree[index] = {
                                parentMenu: app.clone(permission.menu.parentMenu),
                                menus: {}
                            };
                        }
                        if (permission.menu.menus == null) {
                            menuTree[index].parentMenu.permissions = [permission.name];

                        }
                        menuTree[index].parentMenu.subMenusRender = menuTree[index].parentMenu.subMenusRender || (subMenusRender != null ? subMenusRender : true);
                    }

                    const menuTreeItem = menuTree[permission.menu.parentMenu.index],
                        submenus = permission.menu.menus;
                    if (submenus) {
                        Object.keys(submenus).forEach(menuIndex => {
                            if (menuTreeItem.menus[menuIndex]) {
                                const menuTreItemMenus = menuTreeItem.menus[menuIndex];
                                if (menuTreItemMenus.title == submenus[menuIndex].title && menuTreItemMenus.link == submenus[menuIndex].link) {
                                    menuTreItemMenus.permissions.push(permission.name);
                                }
                                else {
                                    console.error(`Menu index #${menuIndex} is not available!`);
                                }
                            }
                            else {
                                menuTreeItem.menus[menuIndex] = app.clone(submenus[menuIndex], { permissions: [permission.name] });
                            }
                        });
                    }
                }

                systemPermission.includes(permission.name) || systemPermission.push(permission.name);
            });
        },

        check: (...permissions) => async (req, res, next) => {
            if (app.isDebug && !req.session.user) {
                const email = req.cookies.personEmail || app.defaultAdminEmail;
                const user = await app.model.fwUser.get({ email });
                if (user == null) {
                    res.send({ error: 'System has errors!' });
                } else {
                    await app.updateSessionUser(req, user);
                    checkPermissions(req, res, next, permissions);
                }
            } else {
                checkPermissions(req, res, next, permissions);
            }
        },

        orCheck: (...permissions) => async (req, res, next) => {
            if (app.isDebug && !req.session.user) {
                const email = req.cookies.personEmail || app.defaultAdminEmail;
                const user = await app.model.fwUser.get({ email });
                await app.updateSessionUser(req, user);
                checkOrPermissions(req, res, next, permissions);
            } else {
                checkOrPermissions(req, res, next, permissions);
            }
        },

        has: async (req, success, fail, ...permissions) => {
            if (typeof fail == 'string') {
                permissions.unshift(fail);
                fail = null;
            }
            if (app.isDebug && !req.session.user) {
                const email = req.cookies.personEmail || app.defaultAdminEmail;
                const user = await app.model.fwUser.get({ email });
                if (!user) {
                    fail && fail({ error: 'System has errors!' });
                } else {
                    await app.updateSessionUser(req, user);
                    responseWithPermissions(req, success, fail, permissions);
                }
            } else {
                responseWithPermissions(req, success, fail, permissions);
            }
        },
        getTreeMenuText: () => {
            let result = '';
            Object.keys(menuTree).sort().forEach(parentIndex => {
                result += `${parentIndex}. ${menuTree[parentIndex].parentMenu.title} (${menuTree[parentIndex].parentMenu.link})\n`;

                Object.keys(menuTree[parentIndex].menus).sort().forEach(menuIndex => {
                    const submenu = menuTree[parentIndex].menus[menuIndex];
                    result += `\t${menuIndex} - ${submenu.title} (${submenu.link})\n`;
                });
            });
            app.fs.writeFileSync(app.path.join(app.assetPath, 'menu.txt'), result);
        }
    };

    const hasPermission = (userPermissions, menuPermissions) => {
        for (let i = 0; i < menuPermissions.length; i++) {
            if (userPermissions.includes(menuPermissions[i])) return true;
        }
        return false;
    };

    app.updateSessionUser = async (req, user) => {
        try {
            user = app.clone(user, { permissions: [], menu: {} });
            delete user.password;
            user.roles = [];
            const result = await app.model.fwUser.get({ id: user.id });
            if (!result) {
                throw 'Invalid user id!';
            } else {
                if (user.active) app.permissionHooks.pushUserPermission(user, 'user:login');
                // const listUserRoles = await app.model.fwRole.getAll({ id: user.id }) || [];
                const result = await app.model.fwUser.getUserRoles(user.email);
                // console.log('listUserRoles trong updateSessionUser', listUserRoles);
                if (result.list && result.list.length) {
                    for (const role of result.list) {
                        user.roles.push(role);
                        if (role.name == 'admin') {
                            user.permissions = app.permission.all();
                            break;
                        }
                        app.permissionHooks.pushUserPermission(user, ...(role.permission || '').split(','));
                    }
                }
                // for (const userRole of listUserRoles) {
                //     const role = await app.model.fwRole.get({ id: userRole.roleId });
                //     console.log('role trong updateSessionUser', role);
                //     role && user.roles.push(role);
                //     if (role.name == 'admin') {
                //         user.permissions = app.permission.all();
                //         break;
                //     }
                //     (JSON.parse(role.permission) || []).forEach(permission => app.permissionHooks.pushUserPermission(user, permission.trim()));

                // }
                // Build menu tree
                user.menu = app.permission.tree();
                Object.keys(user.menu).forEach(parentMenuIndex => {
                    let flag = true;
                    const menuItem = user.menu[parentMenuIndex];
                    if (menuItem.parentMenu && menuItem.parentMenu.permissions) {
                        if (hasPermission(user.permissions, menuItem.parentMenu.permissions)) {
                            delete menuItem.parentMenu.permissions;
                        } else {
                            delete user.menu[parentMenuIndex];
                            flag = false;
                        }
                    }

                    flag && Object.keys(menuItem.menus).forEach(menuIndex => {
                        const menu = menuItem.menus[menuIndex];
                        if (hasPermission(user.permissions, menu.permissions)) {
                            delete menu.permissions;
                        } else {
                            delete menuItem.menus[menuIndex];
                            if (Object.keys(menuItem.menus).length == 0) delete user.menu[parentMenuIndex];
                        }
                    });
                });

                if (req.session) {
                    req.session.user = user;
                } else {
                    req.session = { user };
                }
                req.session.save();
                return user;
            }
        } catch (error) {
            console.error('app.updateSessionUser', error);
        }
    };

    // Permission Hook -------------------------------------------------------------------------------------------------
    const permissionHookContainer = { staff: {}, lecturer: {} };
    app.permissionHooks = {
        add: (type, name, hook) => {
            if (permissionHookContainer[type]) {
                permissionHookContainer[type][name] = hook;
            } else {
                console.log(`Invalid hook type (${type})!`);
            }
        },
        remove: (type, name) => {
            if (permissionHookContainer[type] && permissionHookContainer[type][name]) {
                delete permissionHookContainer[type][name];
            }
        },

        run: (type, user, role) => new Promise((resolve) => {
            const hookContainer = permissionHookContainer[type],
                hookKeys = hookContainer ? Object.keys(hookContainer) : [];
            const runHook = (index = 0) => {
                if (index < hookKeys.length) {
                    const hookKey = hookKeys[index];
                    hookContainer[hookKey](user, role).then(() => runHook(index + 1));
                } else {
                    resolve();
                }
            };
            runHook();
        }),

        pushUserPermission: function () {
            if (arguments.length >= 1) {
                const user = arguments[0];
                for (let i = 1; i < arguments.length; i++) {
                    const permission = arguments[i];
                    if (!user.permissions.includes(permission)) user.permissions.push(permission);
                }
            }
        }
    };

    // Hook readyHooks ------------------------------------------------------------------------------------------------------------------------------
    app.readyHooks.add('permissionInit', {
        ready: () => app.model && app.model.fwRole,
        run: () => app.isDebug && app.permission.getTreeMenuText()
    });
}