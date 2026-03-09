import axios from 'axios';

export const http = axios.create({
  baseURL: '/admin-api',
  withCredentials: true,
});
