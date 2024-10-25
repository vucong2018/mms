import moment from 'moment';

export function date_utils(app) {
    app.utils = {
        ...app.utils,
        date: {
            moment,
            // Add custom date utils here

        }
    };
}