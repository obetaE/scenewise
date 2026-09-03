import express from "express";
import "dotenv/config";
import cors from "cors";

import movieRoutes from "./routes/movieRoutes.ts";
import reviewRoutes from "./routes/reviewRoutes.ts";
import shelfRoutes from "./routes/shelfRoutes.ts";
import profileRoutes from "./routes/profileRoutes.ts";
import { connectDB } from "./lib/config/db.ts";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.use("/api/movie", movieRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/shelf", shelfRoutes);
app.use("/api/profile", profileRoutes);

app.listen(PORT, () => {
  console.log(`Scenewise backend running on port ${PORT}`);
  connectDB();
});
