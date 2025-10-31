// services/token-service.js
const {
	TokenAssociateTransaction,
	AccountBalanceQuery,
	TransferTransaction,
	TokenId,
	PrivateKey
} = require('@hashgraph/sdk');
const hederaClient = require('./hedera-client');

class TokenService {
	async associateToken(accountId, privateKey, tokenId) {
		const privateKeyObj = (typeof privateKey === 'string')
			? (privateKey.startsWith('0x')
					? PrivateKey.fromStringECDSA(privateKey)
					: PrivateKey.fromString(privateKey))
			: privateKey;

		const tx = await new TokenAssociateTransaction()
			.setAccountId(accountId)
			.setTokenIds([TokenId.fromString(tokenId)])
			.freezeWith(hederaClient.client)
			.sign(privateKeyObj);

		const receipt = await (await tx.execute(hederaClient.client)).getReceipt(hederaClient.client);
		return { status: receipt.status.toString() };
	}

	async getBalances(accountId, tokenId) {
		const bal = await new AccountBalanceQuery().setAccountId(accountId).execute(hederaClient.client);
		const tokenBalance = bal.tokens._map.get(TokenId.fromString(tokenId).toString()) || 0;
		return { hbar: bal.hbars.toString(), tokenBalance };
	}

	async transferToken(tokenId, fromId, fromKey, toId, amount) {
		const privateKeyObj = fromKey.startsWith('0x')
			? PrivateKey.fromStringECDSA(fromKey)
			: PrivateKey.fromString(fromKey);

		const tx = await new TransferTransaction()
			.addTokenTransfer(tokenId, fromId, -amount)
			.addTokenTransfer(tokenId, toId, amount)
			.freezeWith(hederaClient.client)
			.sign(privateKeyObj);

		const receipt = await (await tx.execute(hederaClient.client)).getReceipt(hederaClient.client);
		return { status: receipt.status.toString() };
	}
}

module.exports = new TokenService();
