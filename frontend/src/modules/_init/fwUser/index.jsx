import { lazy } from 'react';

export default {
    routes: {
        '/user/account': lazy(() => import('./adminPage'))
    }
}; 