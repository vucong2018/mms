import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';

// Dynamically import all index.jsx files from redux folders
let reducers = {};
let reducerContainer = {};


const context = import.meta.glob('../**/redux/*.jsx', {
    import: 'default',
    eager: true
});
for (const key in context) {
    const storeModule = context[key];
    if (storeModule.redux) {
        const { redux } = storeModule;
        if (redux.parent && redux.reducers) {
            if (!reducerContainer[redux.parent]) {
                reducerContainer[redux.parent] = {};
            }
            reducerContainer[redux.parent] = Object.assign(reducerContainer[redux.parent], redux.reducers);
        }
        else {
            Object.keys(redux.reducers).forEach(key => reducers[key] = redux.reducers[key]);
        }
    }
}


Object.keys(reducerContainer).forEach((key) => {
    reducers[key] = combineReducers(reducerContainer[key]);
});

// Combine all reducers
const rootReducer = combineReducers(reducers);

// Create the Redux store using configureStore
const store = configureStore({
    reducer: rootReducer,
    middleware: () => [thunk],
});
export { store };
