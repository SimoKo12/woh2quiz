const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { z } = require("zod");
const multer = require("multer");
const path = require("path");

// Zod
const QuestionInput = z.object({
  text: z.string().min(1),
  answer: z.string()
});

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const newName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, newName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Format function
function formatQuestion(question) {
  const attempts = question.attempts || [];

  const attemptsCount = attempts.length;
  const correctCount = attempts.filter(a => a.correct).length;
  const solved = correctCount > 0;

  return {
    id: question.id,
    text: question.text,
    answer: question.answer,
    image: question.image ? `/uploads/${question.image}` : null,
    userName: question.user?.name || null,
    attemptsCount,
    correctCount,
    solved
  };
}

// GET /api/questions
router.get("/", async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        user: true,
        attempts: true
      },
      orderBy: { id: "asc" }
    });

    res.json(questions.map(formatQuestion));
  } catch (err) {
    next(err);
  }
});

// GET /api/questions/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new ValidationError("Invalid id");
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: true,
        attempts: true
      }
    });

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    res.json(formatQuestion(question));
  } catch (err) {
    next(err);
  }
});

// POST /api/questions
router.post("/", authenticate, upload.single("image"), async (req, res, next) => {
  try {
    const { text, answer } = QuestionInput.parse(req.body);

    const newQuestion = await prisma.question.create({
      data: {
        text,
        answer,
        image: req.file ? req.file.filename : null,
        userId: req.user.id
      },
      include: {
        user: true,
        attempts: true
      }
    });

    res.status(201).json(formatQuestion(newQuestion));
  } catch (err) {
    next(err);
  }
});

// PUT /api/questions/:id
router.put("/:id", authenticate, isOwner, upload.single("image"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      throw new ValidationError("Invalid id");
    }

    const { text, answer } = QuestionInput.parse(req.body);

    const updated = await prisma.question.update({
      where: { id },
      data: {
        text,
        answer,
        image: req.file ? req.file.filename : undefined
      },
      include: {
        user: true,
        attempts: true
      }
    });

    res.json(formatQuestion(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/questions/:id
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
