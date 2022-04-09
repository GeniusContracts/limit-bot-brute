import { TezosToolkit } from '@taquito/taquito';
import { RemoteSigner } from '@taquito/remote-signer';
import * as crypto from "crypto";

// The limits engine
const LIMITS_CTR = "KT1Uq1nmWrnEuBtqMg3FP5nBxfhyHR62y2U3"

//add your address
const ADDR = "tz1.............."

//or use your own for better connection
const Tezos = new TezosToolkit('https://mainnet.api.tez.ie');

// This requires a hot wallet & signer active
// Create a new tz1 using `./tezos-signer gen keys my_limits_bot`
// Keep a signer running in the background using systemctl or screen
// Drop xtz in your bot account from time to time to keep executing
const SIGNER = 'http://127.0.0.1:6732'
const SLEEP_TIME = 30

let last_taken = ""

Tezos.setProvider({
  signer: new RemoteSigner(ADDR, SIGNER),
});

let sending = false;

// fallback that resets the sendlock after some time has passed
function queueResetSendlock(){
	setTimeout(() => {
    sending = false;
  }, 60000)
}



async function checkLimitOrders() {

	if(sending){
		return;
	}

  try {
	  console.log("\n\nStart.")

		// TODO: using a simple dipdup sqlite indexer is smarter than doing this
		// TODO: optimize by sorting by execution bounty

		const contractInstance = await Tezos.wallet.at(LIMITS_CTR)
		const contractStorage = await contractInstance.storage()

    // get max orders
		let i = Number(contractStorage.next_order_id - 1)

		while(i >= 0){

    	// console.log(`Order #${i} Checking`)
			let order = await contractStorage.orderbook.get(i.toString());

			// console.log(order)

			if(order){
    		// console.log(`Order #${i} Simulate`)
				await spawnExecTransaction(i);
			}
			else{
    		// console.log(`Order #${i} Non-Exist`)
			}

			i--
		}
			
    console.log(`All orders checked.`)

	} catch (err) {
		console.log(err)
	}
}
//what we do here is spawn using a single wallet per order exec
//because if we batch and one fails, they all fail. maximize execution bounties by using multiple wallets!
async function spawnExecTransaction(id){

	if(sending){
		return
	}

	// TODO: this can also be rewritten to use batch, but I think its better to do them separately
	// TODO: this should have different wallets that send different txs at the same time.
	// TODO: so if 5 were available to execute, 5 different tz1 accounts spawn transactions, and if one fails the others can go through
  try {
	  let ops = Tezos.wallet.batch([])

		const contractInstance = await Tezos.wallet.at(LIMITS_CTR)

		// this will error out if the limit order isnt ready, which is usually the case.
		await Tezos.estimate.transfer(contractInstance.methods.execLimitOrder(id.toString()).toTransferParams())

    // keep a local variable that knows a blockchain transaction is in progress
    // this bot spams alot, this decreases chance of "counter in the past" errors/lockups 
    sending = true

    // makes sure the sendlock unlocks after 60sec if something goes wrong.
    queueResetSendlock()

		let tx = contractInstance.methods.execLimitOrder(id.toString()).toTransferParams()
	  
	  ops = ops.withTransfer(tx)
	  
		const operation = await ops.send()

    operation.confirmation(1).then(x => {

   		sending = false
			// console.log(`Order #${id} Executed.`)
		}).catch((error) => {
		  console.error(error);
		});

		return;

	} catch (e) {
		// console.log(e)
		// console.log(`Order #${id} Cannot Execute.`)
	}
	
	return;
}

await checkLimitOrders();
setInterval(checkLimitOrders, SLEEP_TIME * 1000);