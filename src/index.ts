import { createJsonRpcRequest } from "@cosmjs/tendermint-rpc/build/jsonrpc";
import dotenv from "dotenv";

import { trySomeArb } from "./arbitrage/arbitrage";
import { Logger } from "./core/logging";
import * as Juno from "./juno/juno";
import { getChainOperator } from "./node/chainoperator";
import { getSkipClient } from "./node/skipclients";
import * as Terra from "./terra/terra";
import { MempoolLoop } from "./types/arbitrage/mempoolLoop";
import { SkipLoop } from "./types/arbitrage/skipLoop";
import { setBotConfig } from "./types/core/botConfig";
import { getPathsFromPool, getPathsFromPools3Hop } from "./types/core/path";

// load env files
dotenv.config();
const botConfig = setBotConfig(process.env);

let getFlashArbMessages = Juno.getFlashArbMessages;
let getPoolStates = Juno.getPoolStates;
let initPools = Juno.initPools;
switch (process.env.CHAIN_PREFIX) {
	case "terra": {
		getFlashArbMessages = Terra.getFlashArbMessages;
		getPoolStates = Terra.getPoolStates;
		initPools = Terra.initPools;
	}
}

console.log("---".repeat(30));
console.log("Environmental variables for setup:");
console.log("RPC ENPDOINT: ", botConfig.rpcUrl);
console.log("OFFER DENOM: ", botConfig.offerAssetInfo);
// console.log("POOLS: ", botConfig.poolEnvs);
console.log("FACTORIES_TO_ROUTERS_MAPPING", botConfig.mappingFactoryRouter);
console.log("USE MEMPOOL: ", botConfig.useMempool);
console.log("USE SKIP: ", botConfig.useSkip);
if (botConfig.useSkip) {
	console.log("SKIP URL: ", botConfig.skipRpcUrl);
}
if (botConfig.skipBidRate) {
	console.log("SKIP BID RATE: ", botConfig.skipBidRate);
}
console.log("---".repeat(30));

/**
 * Runs the main program.
 */
async function main() {
	console.log("Setting up connections and paths");
	const [account, botClients] = await getChainOperator(botConfig);
	const logger = new Logger(botConfig);
	const { accountNumber, sequence } = await botClients.SigningCWClient.getSequence(account.address);
	const chainId = await (
		await botClients.HttpClient.execute(createJsonRpcRequest("block"))
	).result.block.header.chain_id;
	console.log("accountnumber: ", accountNumber, " sequence: ", sequence, "chainid: ", chainId);
	console.log("Done, Clients established");
	console.log("---".repeat(30));
	console.log("Deriving paths for arbitrage");
	const pools = await initPools(botClients, botConfig.poolEnvs, botConfig.mappingFactoryRouter);
	const paths = getPathsFromPool(pools, botConfig.offerAssetInfo);
	const paths2 = getPathsFromPools3Hop(pools, botConfig.offerAssetInfo);
	console.log("2 HOP paths: ", paths.length);
	console.log("3 HOP paths: ", paths2.length);
	paths.push(...paths2);
	console.log("total paths: ", paths.length);
	console.log("---".repeat(30));

	let loop;
	if (
		botConfig.useSkip &&
		botConfig.skipRpcUrl !== undefined &&
		botConfig.skipBidRate !== undefined &&
		botConfig.skipBidWallet !== undefined
	) {
		console.log("Initializing skip loop");
		const [skipClient, skipSigner] = await getSkipClient(
			botConfig.skipRpcUrl,
			botConfig.mnemonic,
			botConfig.chainPrefix,
		);
		loop = new SkipLoop(
			pools,
			paths,
			trySomeArb,
			getPoolStates,
			getFlashArbMessages,
			botClients,
			account,
			botConfig,
			skipClient,
			skipSigner,
			logger,
		);
	} else if (botConfig.useMempool === true) {
		console.log("Initializing mempool loop");
		loop = new MempoolLoop(
			pools,
			paths,
			trySomeArb,
			getPoolStates,
			getFlashArbMessages,
			botClients,
			account,
			botConfig,
		);
	} else {
		await logger.sendMessage("loop without mempool or skip not implemented yet");
		return;
	}
	// main loop of the bot
	await loop.fetchRequiredChainData();

	console.log("starting loop");
	while (true) {
		await loop.step();
		loop.reset();
		if (loop.iterations % 150 === 0) {
			const message =
				">*chain: * " +
				loop.chainid +
				" *wallet: * " +
				account.address +
				" sign of life, bot is running for " +
				loop.iterations +
				" blocks";
			await logger.sendMessage(message);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
