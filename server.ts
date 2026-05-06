import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // AirQo Proxy Route
  app.get("/api/airqo/measurements", async (req, res) => {
    try {
      const apiKey = process.env.VITE_AIRQO_API_KEY || process.env.AIRQO_API_KEY;
      
      if (!apiKey) {
        console.error("PROXY ERROR: AirQo API Key is not defined in environment.");
        return res.status(500).json({ error: "AirQo API Key missing on server" });
      }

      // The grid ID provided by the user was missing the last character (f).
      // Resolved to "Greater Kampala" grid: 67c9681471c7b0001383d7af
      const gridId = "67c9681471c7b0001383d7af";
      const url = `https://api.airqo.net/api/v2/devices/measurements/grids/${gridId}`;

      console.log(`[Proxy] Fetching AirQo grid data: Greater Kampala (${gridId})`);

      const response = await axios.get(url, {
        params: {
          token: apiKey.trim(),
          tenant: "airqo"
        },
      });

      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error(`[Proxy] AirQo API Error: ${status} - ${error.message}`);
      if (errorData) {
        console.error(`[Proxy] Error Details:`, JSON.stringify(errorData));
      }
      
      res.status(status).json({
        error: "Failed to fetch AirQo data",
        details: error.message,
        apiResponse: errorData,
        status: status
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
