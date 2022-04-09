# limit-bot-brute

Horribly optimized bot that checks for limit orders to execute. Has no validation and simulates every order to see if executable, instead of checking the math and the price.

At the very least, add some validation so you dont take meme-orders that have near-0 execution fees. GC's limit bot will probably stay this unoptimized to subsidize cleaning up spam orders.

Expect the next version to include a simple dipdup indexer to track orders, and the execution bot is a hooked function that runs on an interval.

Use this with a systemctl service to recover from any blockchain errors and keep uptime. An example service is in /svc

```
npm install
node index.js
```
