const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const { ValidationError, NotFoundError } = require("../lib/errors");
const { z } = require("zod");

// Zod validation
const AttemptInput = z.object({
  questionId: z.number(),
  correct: z.boolean()
});

// GET /api/attempts
router.get("/", authenticate, async (req, res, next) => {
  try {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.user.id },
      include: { question: true },
      orderBy: { id: "asc" }
    });

    res.json(attempts);
  } catch (err) {
    next(err);
  }
});

// POST /api/attempts
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { questionId, correct } = AttemptInput.parse(req.body);

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    const attempt = await prisma.attempt.create({
      data: {
        questionId,
        correct,
        userId: req.user.id
      }
    });

    res.status(201).json(attempt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
