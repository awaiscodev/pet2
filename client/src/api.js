import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5000/api"
      : "https://YOUR-NEW-PET2-BACKEND.vercel.app/api",
});

export default api;