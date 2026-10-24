import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();

import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import studentRoutes from "./Routes/studentRoutes.js";

// Recreate directory name in ES modules
const __filename = fileURLToPath(import.meta.url); // this is the current files path
const __dirname = path.dirname(__filename);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/nitResults")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.error("Database connection breakdown:", err));

// setting up the ejs engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Application Routes
app.use("/", studentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER STARTED on PORT: 3000");
});
