import axios from 'axios';

export function isAxiosCanceled(error) {
    return axios.isCancel(error)
        || error?.code === 'ERR_CANCELED'
        || error?.name === 'CanceledError'
        || error?.message === 'canceled';
}
