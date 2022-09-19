import { config } from 'dotenv';
import axios from 'axios';
import Period from './enums/Period';
import Candle from './models/Candle';
import { createMessageChannel } from './messages/messageChannel';

config();

const readMarketPrice = async (): Promise<number> => {
  const result = await axios.get(process.env.PRICES_API);
  const data = result.data;
  const price = data.bitcoin.usd;
  return price;
}

//readMarketPrice();

const generateCandles = async () => {

  const messageChannel = await createMessageChannel();

  if (messageChannel) {
    while (true) {;
      const loopTimes = Period.ONE_MINUTE / Period.TEN_SECONDS;
      const candle = new Candle('BTC', new Date());

      console.log('-----------------------------------');
      console.log('Generating new candle');


      for (let i = 0; i < loopTimes; i++) {
        const price = await readMarketPrice();
        candle.addValue(price);
        console.log(`Market price #${i + 1} of ${loopTimes}`);
        await new Promise(r => {
          setTimeout(r, Period.TEN_SECONDS);
        });
      }

      candle.closeCandle();
      console.log('Candle closed');
      const candleObj = candle.toSimpleObject();
      console.log(candleObj);
      const candleJson = JSON.stringify(candleObj);
      if (messageChannel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(candleJson))) {
        console.log('Candle enqueued');
      }
      else {
        console.log('Nao enfileirada');
      }
    }
  }
}

generateCandles();