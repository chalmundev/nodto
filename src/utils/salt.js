
/// from https://github.com/near-examples/pow-faucet/blob/cfea41c40a75b8c410e6c5e819083b0ef82aaa4e/frontend/src/App.js
export const getSalt = async (list_name, account_id, difficulty) => {
	let msg = [...new TextEncoder('utf-8').encode(`${list_name}:${account_id}:`)];
	msg.push(0, 0, 0, 0, 0, 0, 0, 0);
	msg = new Uint8Array(msg);

	const len = msg.length;
	let bestDifficulty = 0;
	for (let salt = 0; ; ++salt) {
		// browser
		const hashBuffer = new Uint8Array(await crypto.subtle.digest('SHA-256', msg));
		// nodejs
		// const hashBuffer = createHash('sha256').update(msg).digest();

		// compute number of leading zero bits
		let totalNumZeros = 0;
		for (let i = 0; i < hashBuffer.length; ++i) {
			let numZeros = Math.clz32(hashBuffer[i]) - 24;
			totalNumZeros += numZeros;
			if (numZeros < 8) {
				break;
			}
		}
		// checking difficulty
		if (totalNumZeros >= difficulty) {
			console.log('salt: ', salt);
			return salt;
		} else if (totalNumZeros > bestDifficulty) {
			bestDifficulty = totalNumZeros;
		}
		// incrementing salt
		for (let i = len - 8; i < len; ++i) {
			if (msg[i] === 255) {
				msg[i] = 0;
			} else {
				++msg[i];
				break;
			}
		}
	}
};