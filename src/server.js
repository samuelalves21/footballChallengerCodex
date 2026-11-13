const express = require("express");

const app = express();
const port = 3000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "football-lab",
  });
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});