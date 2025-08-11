import { FunctionToolGenerator, GetToolsFunction, HandleToolFunction, MessageListenerFunction, SystemPromptFunction } from "../components/OpenAIAgent";

export const getSystemPrompt: SystemPromptFunction = () => {
    return "You are a helpful AI assistant.";
};

export const messageListener: MessageListenerFunction = (message: string) => {
    console.log("Message from AI:", message);
}

export const handleTool: HandleToolFunction = async (name, options) => {
    switch (name) {
        case 'getBlogPosts':
            const { limit, page } = options;
            return { success: true, content: { title: "Comisar Rex" } }
    }
    return { success: false, message: "Unknown tool" }
}

export const getTools: GetToolsFunction = () => {
    return [FunctionToolGenerator.getTool('getBlogPosts', "Retrieve blog posts", [
        FunctionToolGenerator.getFunctionToolParameter('limit', 'integer', 'Maximum number of blog posts to retrieve', true),
        FunctionToolGenerator.getFunctionToolParameter('page', 'integer', 'Page number to retrieve', true)
    ])]
}