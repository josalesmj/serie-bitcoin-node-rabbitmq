import { Channel, connect } from 'amqplib';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import * as http from 'http';
import CandleController from '../controllers/CandleController';
import { Candle } from '../models/CandleModel';

config();

export default class CandleMessageChannel {
  private _channel!: Channel;
  private _channelCtrl: CandleController;
  private _io: Server;

  constructor(server: http.Server) {
    this._channelCtrl = new CandleController();
    this._io = new Server(server, {
      cors: {
        origin: process.env.SOCKET_CLIENT_SERVER,
        methods: ['GET','POST']
      }
    });
    this._io.on('connection', () => {
      console.log('Web socket connection created');
    });
  }

  private async _createMessageChannel() {
    try {
      const connection = await connect(process.env.AMQP_SERVER ?? 'default value not configured');
      this._channel = await connection.createChannel();
      this._channel.assertQueue(process.env.QUEUE_NAME ?? 'default value not configured');
    }
    catch (err) {
      console.log('Connection to RabbitMQ failed');
      console.log(err);
    }
  }

  async consumeMessages() {
    await this._createMessageChannel();
    if (this._channel) {
      this._channel.consume(process.env.QUEUE_NAME ?? 'default value not configured', async msg => {
        const candleObj = JSON.parse(msg!.content.toString());
        console.log('Message received');
        console.log(candleObj);
        this._channel.ack(msg!); //Avisando ao RabbitMQ que a mensagem foi recebida.

        const candle: Candle = candleObj;
        await this._channelCtrl.save(candle);
        console.log('Candle saved to database');
        this._io.emit(process.env.SOCKET_EVENT_NAME ?? 'default value not configured', candle);
        console.log('New candle emited be web socket');
      });
      console.log('Candle consumer started');
    }
  }
}

