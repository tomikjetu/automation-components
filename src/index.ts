import dotenv from 'dotenv';
import { FunctionToolGenerator, OpenAIAgent } from './components/OpenAIAgent';
import { getSystemPrompt, getTools, handleTool, messageListener } from './config/openai.config';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API key");

var agent = new OpenAIAgent(OPENAI_API_KEY, {
    messageListener,
    getSystemPrompt,
    getTools,
    handleTool
});

agent.chat('please show me the latest blog post title');
