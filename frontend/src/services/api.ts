import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

export const deleteTask = async (id: number) => {
  await api.delete(`tasks/${id}/`);
};

export default api;
