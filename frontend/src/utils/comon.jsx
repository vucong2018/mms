import axios from 'axios';

const instance = axios.create({
    withCredentials: true
});

const T = {

};
['get', 'post', 'put', 'delete'].forEach(key => {
    T[key] = instance[key];
});
export default T;