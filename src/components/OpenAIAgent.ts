import OpenAI from 'openai';
import { ResponseFunctionToolCall, ResponseInput, ResponseInputItem, ResponseOutputText, Tool } from 'openai/resources/responses/responses';

export interface SystemPromptFunction { (): string; }
export interface MessageListenerFunction { (message: string): void; }
export interface GetToolsFunction { (): Tool[]; }
export interface HandleToolFunction {
    (name: string, options: any): Promise<{
        success: boolean;
        content?: any;
        message?: string;
    }>;
}

type FunctionToolParameterType = "string" | "integer" | "boolean" | "object";
export interface FunctionToolParameter {
    name: string,
    type: FunctionToolParameterType,
    description: string,
    required: boolean
}
export interface FunctionToolParameterProperties {
    type: string; description: string
}

export class FunctionToolGenerator {
    static getTool(name: string, description: string, parameters: FunctionToolParameter[]): Tool {
        return {
            type: "function",
            name: name,
            strict: true,
            description: description,
            parameters: {
                type: "object",
                properties: parameters.reduce((acc, item) => {
                    acc[item.name] = {
                        type: item.type,
                        description: item.description
                    };
                    return acc;
                }, {} as Record<string, FunctionToolParameterProperties>),
                required: parameters.filter(item => item.required).map(item => item.name),
                additionalProperties: false
            }
        };
    }
    static getFunctionToolParameter(name: string, type: FunctionToolParameterType, description: string, required: boolean): FunctionToolParameter {
        return {
            name: name,
            type: type,
            description: description,
            required: required
        };
    }
}

export class OpenAIAgent {
    private openai: OpenAI;
    private chatHistory: ResponseInput;
    private messageListener: MessageListenerFunction;
    private getSystemPrompt: SystemPromptFunction;
    private getTools: GetToolsFunction;
    private handleTool: HandleToolFunction;

    constructor(apiKey: string, options: {
        messageListener: MessageListenerFunction,
        getSystemPrompt: SystemPromptFunction,
        getTools: GetToolsFunction,
        handleTool: HandleToolFunction
    }) {
        this.openai = new OpenAI({ apiKey });
        this.chatHistory = [];
        this.messageListener = options.messageListener;
        this.getSystemPrompt = options.getSystemPrompt;
        this.getTools = options.getTools;
        this.handleTool = options.handleTool;
    }

    public getChatHistory(): ResponseInput {
        return this.chatHistory;
    }

    async handleFunctionCalls(functionCallStack: ResponseFunctionToolCall[]): Promise<ResponseInputItem[]> {
        const output: ResponseInputItem[] = [];
        for (const item of functionCallStack) {
            const options = JSON.parse(item.arguments);
            var result = await this.handleTool(item.name, options);
            output.push({
                type: "function_call_output",
                call_id: item.call_id,
                output: JSON.stringify(result)
            });
        }
        return output;
    }

    private async getResponse() {
        const response = await this.openai.responses.create({
            model: 'gpt-4.1',
            input: this.chatHistory,
            instructions: this.getSystemPrompt(),
            text: {
                "format": {
                    "type": "text"
                },
                "verbosity": "medium"
            },
            tools: this.getTools()
        });

        const items: ResponseInputItem[] = response.output;
        this.chatHistory.push(...items);

        const functionCallStack: ResponseInputItem[] = [];

        for (const item of items) {
            switch (item.type) {
                case "message":
                    for (const content of item.content as ResponseOutputText[]) {
                        this.messageListener(content.text);
                    }
                    break;
                case "function_call":
                    functionCallStack.push(item);
                    break;
                default:
                    // possibly reasoning, or other unnecessary processing
                    console.log("Unhandled response item type:", item.type);
                    break;
            }
        }

        if (functionCallStack.length > 0) {
            const functionOutput = await this.handleFunctionCalls(functionCallStack as ResponseFunctionToolCall[]);
            this.chatHistory.push(...functionOutput);
            await this.getResponse();
        }

    }

    public async chat(message: string) {
        this.chatHistory.push({
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: message
                }
            ]
        });
        await this.getResponse();
    }
}
