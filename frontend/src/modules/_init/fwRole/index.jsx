import { lazy } from 'react';

export default {
    routes: {
        '/user/role': lazy(() => import('./adminPage'))
    }
}; 