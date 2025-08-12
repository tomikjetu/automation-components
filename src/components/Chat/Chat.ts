import express from "express"
import bodyParser from "body-parser";

export interface ChatClientListener { (message: string): void; }

export class ChatClient {
    private readonly onUserMessage: ChatClientListener;
    private port: number;
    private app: express.Application;
    private agentQueue: string[] = [];

    constructor(port: number, { options: { onUserMessage } }: { options: { onUserMessage: ChatClientListener } }) {
        this.onUserMessage = onUserMessage;
        this.port = port;
        this.app = express();
        this.start();

        this.app.use(bodyParser.json());
        this.app.get('/app', this.appHtml);
        this.app.post('/chat', this.postChat);
        this.app.get('/chat', this.getChat);
    }

    public appHtml = (req: express.Request, res: express.Response): void => {
        res.sendFile('index.html', { root: 'src/components/Chat' });
    }

    public postChat = (req: express.Request, res: express.Response): void => {
        const message = req.body.message as string;
        this.onUserMessage(message);
        res.sendStatus(200);
    }

    public getChat = (req: express.Request, res: express.Response): void => {
        res.json(this.agentQueue);
        this.agentQueue = [];
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Chat client listening on port ${this.port}`);
        });
    }

    public addAgentMessageToQueue(message: string): void {
        this.agentQueue.push(message);
    }
}
