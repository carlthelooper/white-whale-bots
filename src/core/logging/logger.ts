import { BotConfig } from "../../types/core/botConfig";
import { DiscordLogger } from "./discordLogger";
import { SlackLogger } from "./slackLogger";

/**
 *
 */
export class Logger {
	private botConfig: BotConfig;
	public discordLogger?: DiscordLogger;
	public slackLogger?: SlackLogger;

	// Codes that are not sent to external sources (discord, slack)
	private externalExemptCodes: Array<number> = [4];

	/**
	 *
	 */
	constructor(config: BotConfig) {
		this.botConfig = config;

		if (this.botConfig.discordWebhookUrl) {
			this.discordLogger = new DiscordLogger(this.botConfig.discordWebhookUrl);
		}

		if (this.botConfig.slackToken && this.botConfig.slackChannel) {
			this.slackLogger = new SlackLogger(this.botConfig.slackToken, this.botConfig.slackChannel);
		}
	}

	/**
	 * Sends the `message` to the console and to discord or slack if defined.
	 * @param message The message to log.
	 * @param code The code number of the message, -1 if not given.
	 */
	public async sendMessage(message: string, code = -1) {
		if (message) {
			// Don't send common errors to discord/slack
			if (!this.externalExemptCodes.includes(code)) {
				if (this.discordLogger) {
					await this.discordLogger.sendMessage(message);
				}

				if (this.slackLogger) {
					await this.slackLogger.sendMessage(message);
				}
			}

			// Log all messages to console
			console.log(message);
		}
	}
}
