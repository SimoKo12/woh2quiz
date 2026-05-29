const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { z } = require("zod");

// Zod validation
const QuestionInput = z.object({
  text: z.string().min(1),
  answer: z.string()
});

// FormatQuestion function
function formatQuestion(question) {
  return {
    id: question.id,
    text: question.text,
    answer: question.answer,
    userName: question.user?.name || null
  };
}

// GET /api question
router.get("/", async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({
      include: { user: true },
      orderBy: { id: "asc" }
    });

    res.json(questions.map(formatQuestion));
  } catch (err) {
    next(err);
  }
});

// GET /api question id
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new ValidationError("Invalid id");
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    res.json(formatQuestion(question));
  } catch (err) {
    next(err);
  }
});

// POST /api question
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { text, answer } = QuestionInput.parse(req.body);

    const newQuestion = await prisma.question.create({
      data: {
        text,
        answer,
        userId: req.user.id
      },
      include: { user: true }
    });

    res.status(201).json(formatQuestion(newQuestion));
  } catch (err) {
    next(err);
  }
});

// PUT /api id
router.put("/:id", authenticate, isOwner, async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new ValidationError("Invalid id");
    }

    const { text, answer } = QuestionInput.parse(req.body);

    const updated = await prisma.question.update({
      where: { id },
      data: { text, answer },
      include: { user: true }
    });

    res.json(formatQuestion(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api id
router.delete("/:id", authenticate, isOwner, async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new ValidationError("Invalid id");
    }

    await prisma.question.delete({
      where: { id }
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
