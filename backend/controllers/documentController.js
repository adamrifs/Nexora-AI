const multer = require("multer");
const Document = require("../models/Document");
const Brain = require("../models/Brain");
const { extractText } = require("../services/documentExtractor");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {
  HumanMessage,
  AIMessage,
  SystemMessage,
} = require("@langchain/core/messages");

// ─── Multer — memory storage, 20 MB limit ────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
];

const ALLOWED_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "xlsx",
  "xls",
  "csv",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split(".").pop().toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: .${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Export middleware for use in route
const uploadMiddleware = upload.single("document");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ANALYSIS_CHAR_LIMIT = 15000; // sent to AI
const STORAGE_CHAR_LIMIT = 50000; // stored for Q&A

const buildAnalysisSystemPrompt = ({
  ext,
  wasTruncated,
  truncatedText,
  memoryContext,
  userMessage,
}) =>
  `
You are Nexora AI, an elite business consultant and strategic advisor with 20+ years of experience.

You have been given a ${ext.toUpperCase()} document to analyze. 
Your job is NOT to merely summarize it — you must act like a world-class business consultant:
proactively identify problems, hidden risks, untapped opportunities, and recommend concrete solutions.

USER CONTEXT (use to personalize):
${memoryContext}

${wasTruncated ? "⚠️ Document was truncated to the first 15,000 characters due to length.\n" : ""}

DOCUMENT CONTENT:
---
${truncatedText}
---

${userMessage ? `USER'S SPECIFIC FOCUS: "${userMessage}"\n` : ""}

ANALYSIS FORMAT — produce ALL sections below in markdown:

Start immediately with a conversational 1-2 sentence explanation of what the document actually is. Do NOT use a "What is this?" heading. Just write the text naturally. (e.g., "The file you uploaded is a short business plan for a flower and gift eCommerce company called Bloom & Beyond.")

**Key Points**
Provide a brief, easy-to-read section highlighting the core ideas:
- **Business Idea**: ...
- **Target Customers**: ...
- **Main Goal**: ...

---

# 📄 Document Intelligence Report

## 🔍 Executive Summary
3-5 concise bullet points covering the core purpose and key takeaway.

## 📊 Key Findings
The most important data, facts, or conclusions. Use specific numbers or quotes from the document.

## ⚠️ Risks Detected
Critical risks, red flags, or concerns. Be specific and cite where in the document you found them.

## 💡 Opportunities Identified
Hidden opportunities, untapped potential, or positive signals.

## ✅ Recommended Solutions
For each risk identified, provide one concrete, actionable recommendation.

## 🗺️ Action Plan
A prioritized 30 / 60 / 90-day action plan.

## 📌 Recommended Next Steps
List 3–5 specific, actionable follow-up actions the user should consider based on this document.

## 🌍 Real-World Examples
1-2 real companies that faced similar challenges and how they dealt with them.

---
CRITICAL: After all your markdown, append BOTH of these XML blocks at the very end:

<doc_risks>
<risk>Specific concise risk (max 12 words)</risk>
<risk>Another specific risk</risk>
</doc_risks>

<doc_opportunities>
<opportunity>Specific concise opportunity (max 12 words)</opportunity>
<opportunity>Another specific opportunity</opportunity>
</doc_opportunities>

Include 3-6 items in each block. Make them specific to THIS document, never generic.
`.trim();

const buildQASystemPrompt = (doc) =>
  `
You are Nexora AI, an expert business consultant. You previously analyzed a document and the user is asking follow-up questions about it.

DOCUMENT: "${doc.title}" (${doc.fileType.toUpperCase()})

DOCUMENT CONTENT (excerpt for context):
---
${doc.extractedText.substring(0, 10000)}
---

PREVIOUS ANALYSIS (summary):
---
${doc.analysis.substring(0, 2000)}
---

Answer the user's question about this document with precision. Reference specific parts of the document when relevant. Be concise and actionable.

CRITICAL INSTRUCTIONS:
1. **If the user asks a general question like "what is this?", "summarize", or "explain"**: Do NOT just dump the formal analysis. Instead, start with a 1-2 sentence conversational explanation of what the document is, followed by a brief bulleted list of "Key Points", and then answer their specific question.
2. **Proactive Advisory (MANDATORY)**: You are a senior business consultant. NEVER just answer the question and stop. At the end of EVERY SINGLE RESPONSE you generate (no exceptions), you MUST include exactly this section:

**📌 Recommended Next Steps**
- [Actionable follow-up 1]
- [Actionable follow-up 2]
- [Actionable follow-up 3]

If you fail to include the "**📌 Recommended Next Steps**" section at the end of your message, you have failed your core directive.
`.trim();

// ─── Controller: POST /api/documents/analyze ─────────────────────────────────
const analyzeDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userMessage = (req.body.message || "").trim();

    // 1. Extract text
    let extractionResult;
    try {
      extractionResult = await extractText(buffer, originalname);
    } catch (err) {
      return res.status(422).json({ message: err.message });
    }

    const { text: extractedText } = extractionResult;

    if (!extractedText || extractedText.trim().length < 30) {
      return res.status(422).json({
        message:
          "Could not extract readable text. The file may be image-based or empty.",
      });
    }

    // 2. Open SSE stream immediately
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 3. Load user memories + prepare context in parallel
    const userId = req.user?._id;
    const memories = userId ? await Brain.find({ userId }) : [];
    const memoryContext =
      memories.length > 0
        ? memories.map((m) => m.fact).join("\n")
        : "No saved memories about this user.";

    const ext = originalname.split(".").pop().toLowerCase();
    const wasTruncated = extractedText.length > ANALYSIS_CHAR_LIMIT;
    const truncatedText = extractedText.substring(0, ANALYSIS_CHAR_LIMIT);

    const systemPrompt = buildAnalysisSystemPrompt({
      ext,
      wasTruncated,
      truncatedText,
      memoryContext,
      userMessage,
    });

    // 4. Stream AI analysis
    if (!process.env.GEMINI_API_KEY) {
      res.write(
        `data: ${JSON.stringify({ type: "error", content: "GEMINI_API_KEY not configured." })}\n\n`,
      );
      return res.end();
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
      streaming: true,
      maxRetries: 0,
    });

    let finalAnalysis = "";

    const stream = await llm.stream([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        "Please analyze this document and provide your expert business consultant report.",
      ),
    ]);

    for await (const chunk of stream) {
      const text = chunk.content;
      if (text) {
        finalAnalysis += text;
        res.write(
          `data: ${JSON.stringify({ type: "token", content: text })}\n\n`,
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);

    // 5. Save to MongoDB
    const docTitle = originalname.replace(/\.[^/.]+$/, ""); // strip extension
    const document = await Document.create({
      userId,
      fileName: originalname,
      fileType: ext,
      fileSize: size,
      title: docTitle,
      extractedText: extractedText.substring(0, STORAGE_CHAR_LIMIT),
      analysis: finalAnalysis,
      chatHistory: userMessage ? [{ role: "user", content: userMessage }] : [],
    });

    // 6. Send document ID so frontend can route Q&A
    res.write(
      `data: ${JSON.stringify({ type: "document_saved", documentId: document._id.toString(), title: docTitle })}\n\n`,
    );

    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error("[Document Analysis Error]:", error.message || error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`,
      );
      res.end();
    }
  }
};

// ─── Controller: POST /api/documents/:id/question ────────────────────────────
const askAboutDocument = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ message: "Question is required." });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Build history (last 10 turns)
    const history = doc.chatHistory
      .slice(-10)
      .map((msg) =>
        msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content),
      );

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.6,
      streaming: true,
      maxRetries: 0,
    });

    let answer = "";

    const stream = await llm.stream([
      new SystemMessage(buildQASystemPrompt(doc)),
      ...history,
      new HumanMessage(question),
    ]);

    for await (const chunk of stream) {
      const text = chunk.content;
      if (text) {
        answer += text;
        res.write(
          `data: ${JSON.stringify({ type: "token", content: text })}\n\n`,
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);

    // Persist Q&A turn
    doc.chatHistory.push({ role: "user", content: question });
    doc.chatHistory.push({ role: "ai", content: answer });
    await doc.save();

    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error("[Document Q&A Error]:", error.message || error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`,
      );
      res.end();
    }
  }
};

// ─── Controller: GET /api/documents ──────────────────────────────────────────
const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user._id })
      .select("title fileName fileType fileSize createdAt")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Controller: GET /api/documents/:id ──────────────────────────────────────
const getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized." });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Controller: DELETE /api/documents/:id ───────────────────────────────────
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found." });
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized." });
    }
    await Document.deleteOne({ _id: req.params.id });
    res.json({ message: "Document deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadMiddleware,
  analyzeDocument,
  askAboutDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
};
