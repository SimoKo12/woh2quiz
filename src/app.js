const express = require("express");
const app = express();
const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const attemptsRouter = require("./routes/attempts");
const { NotFoundError } = require("./lib/errors");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");
const errorHandler = require("./middleware/errorHandler");

app.use(pinoHttp({
  logger,
  autoLogging: { ignore: req => req.url.startsWith("/uploads") }
}));

app.use(express.static("public"));
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/attempts", attemptsRouter);

// 404 handler
app.use((req, res) => {
  throw new NotFoundError();
});

// Error handler
app.use(errorHandler);

module.exports = app;
