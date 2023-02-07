import { WebClient } from "@slack/web-api";

export class SlackLogger {
	public channel?: string;
    public client: WebClient;
	
    constructor(token: string, channel: string) {
        this.client = new WebClient(token);
		this.channel = channel;
    }

    /**
     * Sends the `message` to the Slack channel `channel` if the `client` is available.
	 * @param message The message to send to slack.
    */
    public async sendMessage(message: string) {
        if (this.client && this.channel && message) {
            this.client.chat.postMessage({
                text: message,
                channel: this.channel,
            });
        }
    }
}
