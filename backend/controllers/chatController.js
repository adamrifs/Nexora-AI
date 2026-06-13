const Chat = require('../models/Chat');
const Brain = require('../models/Brain');
const { extractAndSaveMemories } = require('../services/memoryExtractor');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { createReactAgent, ToolNode } = require('@langchain/langgraph/prebuilt');
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const { Composio } = require('@composio/core');
const { LangchainProvider } = require('@composio/langchain');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { tavily } = require('@tavily/core');

// @desc    Create a new chat
// @route   POST /api/chat
// @access  Private
const createChat = async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.user._id,
      title: req.body.title || 'New Chat',
      messages: []
    });
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create chat', error: error.message });
  }
};

// @desc    Get all chats for user
// @route   GET /api/chat
// @access  Private
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chats', error: error.message });
  }
};

// @desc    Get chat by ID
// @route   GET /api/chat/:id
// @access  Private
const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    if (chat.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to view this chat' });
    }
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chat', error: error.message });
  }
};

// Custom Tavily Tool
const createTavilyTool = () => {
  return tool(async ({ query }) => {
    try {
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const response = await tvly.search(query, { maxResults: 3, includeImageUrls: true });
      return JSON.stringify({ 
        results: response.results, 
        images: response.images || [] 
      });
    } catch (e) {
      return "Search failed: " + e.message;
    }
  }, {
    name: "tavily_search",
    description: "Search the web for real-time information.",
    schema: z.object({
      query: z.string().describe("The search query to look up"),
    }),
  });
};

// Cache for Composio tools to prevent API call latency on every message
const composioToolsCache = new Map();

// Helper to set up tools
const setupTools = async (userId = 'default') => {
  const tools = [];

  // Memory Tools
  if (userId !== 'default') {
    tools.push(tool(async ({ fact }) => {
      try {
        const memory = await Brain.create({ userId, fact });
        return `Successfully saved memory: ID=${memory._id}, Fact="${fact}"`;
      } catch (e) { return "Failed to save memory: " + e.message; }
    }, {
      name: "create_memory",
      description: "MANDATORY: You MUST call this tool whenever the user tells you their name, company, location, or any personal fact. If you do not call this tool, the fact will be lost forever. Call this tool to save the fact to the database.",
      schema: z.object({ fact: z.string().describe("The fact to remember (e.g., 'User name is Adam', 'Company is Fornax Gaming')") })
    }));

    tools.push(tool(async ({ memoryId, fact }) => {
      try {
        await Brain.findByIdAndUpdate(memoryId, { fact });
        return `Successfully updated memory ID=${memoryId}`;
      } catch (e) { return "Failed to update memory: " + e.message; }
    }, {
      name: "update_memory",
      description: "Update an existing saved memory fact.",
      schema: z.object({ 
        memoryId: z.string().describe("The ID of the memory to update (obtained from the context or list_memories)"),
        fact: z.string().describe("The new updated fact string")
      })
    }));

    tools.push(tool(async ({ memoryId }) => {
      try {
        await Brain.findByIdAndDelete(memoryId);
        return `Successfully deleted memory ID=${memoryId}`;
      } catch (e) { return "Failed to delete memory: " + e.message; }
    }, {
      name: "delete_memory",
      description: "Delete an existing saved memory that is no longer true.",
      schema: z.object({ memoryId: z.string().describe("The ID of the memory to delete") })
    }));

    tools.push(tool(async () => {
      try {
        const memories = await Brain.find({ userId });
        if (memories.length === 0) return "No memories saved.";
        return memories.map(m => `ID=${m._id}: ${m.fact}`).join("\n");
      } catch (e) { return "Failed to retrieve memories: " + e.message; }
    }, {
      name: "list_memories",
      description: "List all currently saved memories about the user.",
      schema: z.object({})
    }));
  }

  if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim() !== '') {
    tools.push(createTavilyTool());
  }

  if (process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_API_KEY.trim() !== '') {
    try {
      const composio = new Composio({
        apiKey: process.env.COMPOSIO_API_KEY,
        provider: new LangchainProvider(),
        dangerouslyAllowAutoUploadDownloadFiles: true,
        fileUploadDirs: ["./", "/tmp"]
      });
      // Get commonly used assistant tools
      const composioTools = await composio.tools.get(userId, { toolkits: ["gmail", "googlecalendar"] });
      tools.push(...composioTools);
    } catch (e) {
      console.error("Failed to initialize Composio tools:", e.message || e);
    }
  }

  return tools;
};

// @desc    Add a message and get AI streaming response
// @route   POST /api/chat/:id/message
// @access  Private
const addMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Add user message to DB
    chat.messages.push({ role: 'user', content });
    if (chat.messages.length === 1 && chat.title === 'New Chat') {
      chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }
    await chat.save(); // Must await: the final save at the end depends on this completing first

    // Setup SSE headers immediately so the connection is open while we do prep work
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Check for Gemini API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      res.write(`data: {"type":"error", "content":"GEMINI_API_KEY is not configured in the backend."}\n\n`);
      return res.end();
    }

    // Convert chat history to LangChain messages (Limit to most recent 20 messages for Token Efficiency)
    const chatHistory = chat.messages.slice(0, -1).slice(-20).map(msg => {
      return msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content);
    });

    // Load Long-Term Brain Memories
    const targetUserId = chat.userId || req.user?._id;
    
    // Fire-and-forget: memory extraction runs in background, doesn't block the stream
    extractAndSaveMemories(targetUserId, content).catch(e => console.error("Memory Extraction Error:", e));

    // OPTIMIZATION: Run memories fetch and tool setup IN PARALLEL — they are fully independent
    const [memories, tools] = await Promise.all([
      Brain.find({ userId: targetUserId }),
      setupTools(req.user?._id?.toString() || 'default')
    ]);

    let memoryContext = "You currently have no saved memories about this user.";
    if (memories.length > 0) {
      memoryContext = memories.map(m => `ID=${m._id}: ${m.fact}`).join("\n");
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
      streaming: true,
      maxRetries: 0, // Disable internal retries to prevent UI from hanging for 60 seconds on rate limit
    });

    const systemPrompt = `You are Nexora AI — a skilled business analyst, researcher, consultant, and collaborative thinking partner. You are not a generic chatbot.

## CORE IDENTITY
Your goal is to help users achieve their objectives, not merely answer questions. You are intelligent, proactive, conversational, and solution-oriented. You think step-by-step and focus on the user's underlying goal — not just their literal words.

## CONTEXT AWARENESS
- Always consider the current message together with the full conversation history and available memories.
- Connect related information across messages — treat the conversation as a continuous discussion, not isolated requests.
- Use stored memories to personalize every response when relevant.
- If the user references something said earlier, use it — do not ask them to repeat themselves.

## CLARIFICATION-FIRST BEHAVIOR
- If a request is ambiguous, incomplete, or missing critical information — do NOT respond with failure messages, "I don't know", or "insufficient information".
- Instead, identify exactly what is missing and ask the user a single, targeted follow-up question.
- Ask only the minimum number of questions needed to proceed.
- Once you have the missing information, continue the task immediately without requiring the user to re-explain.

## SMART REASONING
- When confidence is high, infer reasonable context and proceed.
- When confidence is low, ask for clarification before acting.
- Think step-by-step before responding to complex requests.
- Identify the user's true underlying objective, not just the surface-level request.

## PROBLEM SOLVING
- When identifying a problem, always suggest actionable solutions alongside it.
- When analyzing reports, businesses, or data — always provide recommendations, risks, opportunities, and next actions.
- Be proactive: if you spot something important the user didn't ask about, mention it.

## RESPONSE STYLE
- Be professional, direct, and conversational — like a trusted senior business partner.
- Prefer structured Markdown for complex answers (headers, bullet points, bold).
- For simple chat messages, keep responses concise and human.
- Never lecture or over-explain. Get to the point.

CRITICAL INSTRUCTION FOR BUSINESS RESEARCH:
When the user asks for Company Research, Competitor Analysis, Market Research, or Business Opportunities, you MUST:
1. Use the tavily_search tool to gather real-time data and collect relevant sources.
2. Generate a structured business report using exactly the following Markdown sections:

# [Company/Topic] Business Report

## Executive Summary
Provide a maximum of 5 concise bullet points summarizing the business.

## Competitor Analysis
Provide a brief markdown summary of the competitive landscape.

## Recommendations
Provide a maximum of 5 actionable recommendations for the business.

CRITICAL INSTRUCTION FOR STRUCTURED DATA:
If your response contains specific structured business intelligence (like a SWOT analysis, a direct comparison, company metrics, market data, or sources), you MUST append specialized XML blocks AT THE VERY END of your markdown response.
These blocks will be intercepted by the UI to render beautiful dashboard cards above your message.

Valid XML Blocks (append these at the absolute end of your message, after all your conversational markdown):

1. <company_overview><founded>...</founded><headquarters>...</headquarters><industry>...</industry><website>...</website><products>...</products></company_overview>
2. <swot><strengths>...</strengths><weaknesses>...</weaknesses><opportunities>...</opportunities><threats>...</threats></swot>
3. <comparison><item><feature>...</feature><entity1>...</entity1><entity2>...</entity2></item></comparison>
4. <market_metrics><market_size>...</market_size><growth_rate>...</growth_rate><competitors>...</competitors><trends>...</trends></market_metrics>
5. <sources><source><name>...</name><url>...</url></source></sources>
6. <company_contact><company_name>...</company_name><website>...</website><location>...</location><phone>...</phone><email>...</email><contact_page>...</contact_page><linkedin>...</linkedin><confidence>...</confidence></company_contact>
7. <media_gallery><image><url>...</url><title>...</title><domain>...</domain></image></media_gallery>

IMPORTANT RULES FOR STRUCTURED BLOCKS:
- For company_contact, only use publicly available info. If information cannot be verified, output "Not publicly available." The confidence field should be "High", "Medium", or "Low".
- For media_gallery, you MUST ALWAYS include this block automatically when researching a company. Use the tavily_search tool to find high-quality images of the company (Logo, Headquarters, Products). Include 4 to 8 images. DO NOT hallucinate image URLs, they must be real URLs extracted from search results.

You can include multiple XML blocks if necessary, but they MUST be at the end. Do NOT wrap your entire response in XML.

If you have tools available, use them to find real-time information or interact with external services when asked.
IMPORTANT TOOL INSTRUCTIONS FOR GMAIL:
- Users will often use casual, informal language like "send an email to abc@gmail.com saying hi" or "email John and tell him the meeting is postponed". You MUST be smart enough to interpret these casual requests correctly.
- Extract "recipient_email", "subject", and "body" intelligently from what the user says. NEVER use a parameter named "to" — always use "recipient_email".
- If the user provides no subject, automatically invent a short, relevant one based on the content.
- If the user provides no body, use the casual message they described as the body.
- CRITICAL: If you are missing essential information you cannot infer (e.g., no recipient email address at all), do NOT attempt to call the tool and fail silently. Instead, ask the user a clear, specific question like "Who should I send this email to? Please provide an email address." Act as a smart assistant — always try to resolve ambiguity by asking rather than failing.

CRITICAL INSTRUCTION FOR LONG-TERM MEMORY:
Below are the important facts about this user that have been saved to your permanent memory. Use these facts to heavily personalize your responses.

USER MEMORIES:
${memoryContext}`;

    let finalAiMessage = "";
    
    // Check if tools should be used (e.g., if there's a specific instruction or context)
    // For now, we always bind tools if available
    const hasTools = tools && tools.length > 0;
    
    // We only use the agent executor if we have tools, otherwise standard LLM stream
    if (hasTools) {
      const toolNode = new ToolNode(tools);
      const modelWithTools = llm.bindTools(tools);
      
      const shouldContinue = (state) => {
        const messages = state.messages;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.tool_calls?.length) {
          return "tools";
        }
        return "__end__";
      };

      const callModel = async (state) => {
        const messages = state.messages;
        try {
          const response = await modelWithTools.invoke(messages);
          return { messages: [response] };
        } catch (error) {
          console.error("Error in callModel node:", error.message || error);
          // If it's a rate limit or service unavailable, throw it to the outer catch block
          if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
            throw error; 
          }
          // Fallback for other stream parsing issues
          return { messages: [new AIMessage("I encountered an internal error while processing that request. My connection to the Google API was interrupted. Please try again.")] };
        }
      };

      const workflow = new StateGraph(MessagesAnnotation)
        .addNode("agent", callModel)
        .addNode("tools", toolNode)
        .addEdge("__start__", "agent")
        .addConditionalEdges("agent", shouldContinue)
        .addEdge("tools", "agent");

      const app = workflow.compile();
      
      const messages = [
        new SystemMessage(systemPrompt),
        ...chatHistory,
        new HumanMessage(content)
      ];

      // Stream events from LangGraph
      const stream = await app.streamEvents(
        { messages },
        { version: "v2" }
      );

      for await (const event of stream) {
        if (event.event === "on_chat_model_stream") {
          const text = event.data.chunk.content;
          if (text) {
            finalAiMessage += text;
            res.write(`data: {"type":"token", "content":${JSON.stringify(text)}}\n\n`);
          }
        } else if (event.event === "on_tool_start") {
          res.write(`data: {"type":"tool_start", "content":"${event.name}"}\n\n`);
        } else if (event.event === "on_tool_end") {
          res.write(`data: {"type":"tool_end", "content":"${event.name}"}\n\n`);
        }
      }
      
    } else {
      // Standard stream without tools
      const messages = [
        new SystemMessage(systemPrompt),
        ...chatHistory,
        new HumanMessage(content)
      ];

      const stream = await llm.stream(messages);
      res.write(`data: {"type":"tool_end", "content":""}\n\n`);

      for await (const chunk of stream) {
        const text = chunk.content;
        finalAiMessage += text;
        res.write(`data: {"type":"token", "content":${JSON.stringify(text)}}\n\n`);
      }
    }

    if (!finalAiMessage || finalAiMessage.trim() === "") {
      finalAiMessage = "I encountered an error connecting to the AI provider. The service might be experiencing high demand. Please try again later.";
      res.write(`data: {"type":"error", "content":${JSON.stringify(finalAiMessage)}}\n\n`);
    } else {
      res.write(`data: {"type":"done"}\n\n`);
    }

    // Save final AI response
    chat.messages.push({ role: 'ai', content: finalAiMessage });
    await chat.save();

    if (!res.writableEnded) {
      res.end();
    }

  } catch (error) {
    let userMessage = "Agent execution failed";
    
    if (error.status === 429 || error.message?.includes('429')) {
      userMessage = "API Rate Limit Reached: You have exceeded your Gemini free tier limits (20 requests). Please wait a minute and try again.";
      console.log(`[Google API Warning] 429 Rate Limit. Sending warning to frontend.`);
    } else if (error.status === 503 || error.message?.includes('503')) {
      userMessage = "Google AI is currently experiencing high demand (503). Please try again later.";
      console.log(`[Google API Warning] 503 High Demand. Sending warning to frontend.`);
    } else {
      console.error("Agent execution error:", error);
    }

    if (!res.headersSent) {
      res.status(500).json({ message: userMessage, error: error.message });
    } else if (!res.writableEnded) {
      res.write(`data: {"type":"error", "content":${JSON.stringify(userMessage)}}\n\n`);
      res.end();
    }
  }
};

// @desc    Delete chat by ID
// @route   DELETE /api/chat/:id
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    if (chat.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this chat' });
    }
    await Chat.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Chat removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete chat', error: error.message });
  }
};

module.exports = { createChat, getChats, getChatById, addMessage, deleteChat };
