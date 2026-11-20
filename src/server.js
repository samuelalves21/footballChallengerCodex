process.loadEnvFile();

const express = require("express");
const pool = require("./db");

const app = express();
const port = 3000;

app.use(express.json());

app.get("/api/health", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      service: "football-lab",
      database: "connected",
    });
  } catch (error) {
    console.error("Erro ao ligar ao PostgreSQL:", error.message);

    res.status(503).json({
      status: "error",
      service: "football-lab",
      database: "unavailable",
    });
  }
});

app.get("/api/teams", async (req, res) => {
  try {
    const result = await pool.query(`
      Select id, name, country, founded_year, created_at
      from teams
      ORDER by id
      `);
      res.status(200).json(result.rows);
      } catch (error) {
        console.error("Erro ao consultar equipas:", error.message);
        
        res.status(500).json({
          status: "error",
          message: "Não foi possível consultar as equipas",
        })
      }
  })

  app.get("/api/teams/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "O id deve ser um número inteiro positivo",
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, country, founded_year, created_at
        FROM teams
        WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Equipa não encontrada",
      });
    }

    res.status(200).json({id, team: result.rows[0]});
  } catch (error) {
    console.error("Erro ao consultar equipa:", error.message);

    res.status(500).json({
      status: "error",
      message: "Não foi possível consultar a equipa",
    });
  }
});

  app.post("/api/teams", async (req, res) => {
    const { name, country, founded_year} = req.body

    if (!name || !country) {
      return res.status(400).json({
        status: "error",
        message: "Os campos name e country são obrigatórios"
      })
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO teams (name, country, founded_year)
        VALUES ($1, $2, $3)
        RETURNING id, name, country, founded_year, created_at
        `,
        [name, country, founded_year ?? null]
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Erro ao criar equipa:", error.message)

      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "Já existe uma equipa com esse nome"
        })
      }

      res.status(500).json({
        status: "error",
        message: "Não foi possível criar a equipa"
      })
    }
  })

app.put("/api/teams/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, country, founded_year } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "O id deve ser um número inteiro positivo",
    });
  }

  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof country !== "string" ||
    country.trim() === ""
  ) {
    return res.status(400).json({
      status: "error",
      message: "Os campos name e country são obrigatórios",
    });
  }

  const currentYear = new Date().getFullYear();

  if (
    founded_year !== undefined &&
    founded_year !== null &&
    (
      !Number.isInteger(founded_year) ||
      founded_year < 1800 ||
      founded_year > currentYear
    )
  ) {
    return res.status(400).json({
      status: "error",
      message: `founded_year deve ser um número inteiro entre 1800 e ${currentYear}`,
    });
  }

  try {
    const result = await pool.query(
      `
        UPDATE teams
        SET name = $1,
            country = $2,
            founded_year = $3
        WHERE id = $4
        RETURNING id, name, country, founded_year, created_at
      `,
      [
        name.trim(),
        country.trim(),
        founded_year ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Equipa não encontrada",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar equipa:", error.message);

    if (
      error.code === "23505" &&
      error.constraint === "teams_name_key"
    ) {
      return res.status(409).json({
        status: "error",
        message: "Já existe uma equipa com esse nome",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Não foi possível atualizar a equipa",
    });
  }
});

app.delete("/api/teams/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "O id deve ser um número inteiro positivo",
    });
  }

  try {
    const result = await pool.query(
      `
        DELETE FROM teams
        WHERE id = $1
        RETURNING id, name, country, founded_year, created_at
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Equipa não encontrada",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Equipa eliminada com sucesso",
      team: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao eliminar equipa:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Não foi possível eliminar a equipa",
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
