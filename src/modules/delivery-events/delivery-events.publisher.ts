import { Kafka, logLevel, type Producer } from "kafkajs";
import { env } from "../../config/env.js";

export type PublishedDeliveryEvent = {
  id: string;
  packageId: string;
  driverId: string;
  status: string;
  timestamp: Date;
  createdAt: Date;
};

export interface DeliveryEventPublisher {
  publish(event: PublishedDeliveryEvent): Promise<void>;
  disconnect(): Promise<void>;
}

export type KafkaDeliveryEventPublisherConfig = {
  clientId: string;
  brokers: string[];
  topic: string;
};

export class NoopDeliveryEventPublisher implements DeliveryEventPublisher {
  async publish() {
    // Kafka is disabled by default, so the normal REST API flow stays simple.
  }

  async disconnect() {
    // No external connection exists when Kafka is disabled.
  }
}

export class KafkaDeliveryEventPublisher implements DeliveryEventPublisher {
  private producer: Producer | undefined;
  private connected = false;
  private readonly producerFactory: () => Producer;

  constructor(
    private readonly config: KafkaDeliveryEventPublisherConfig = {
      clientId: env.KAFKA_CLIENT_ID,
      brokers: env.KAFKA_BROKERS,
      topic: env.KAFKA_DELIVERY_EVENTS_TOPIC
    },
    producerFactory?: () => Producer
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      logLevel: logLevel.WARN,
      // This publisher is best-effort. Keep failures quick so Kafka trouble does
      // not make the REST API feel stuck after the database save succeeds.
      connectionTimeout: 3000,
      requestTimeout: 3000,
      retry: {
        retries: 0
      }
    });

    this.producerFactory = producerFactory ?? (() => kafka.producer());
  }

  async publish(event: PublishedDeliveryEvent) {
    const producer = await this.getProducer();

    await producer.send({
      topic: this.config.topic,
      messages: [
        {
          // Package ID is a useful key because downstream consumers often care
          // about ordering per package.
          key: event.packageId,
          value: JSON.stringify({
            eventId: event.id,
            packageId: event.packageId,
            driverId: event.driverId,
            status: event.status,
            timestamp: event.timestamp.toISOString(),
            createdAt: event.createdAt.toISOString()
          })
        }
      ]
    });
  }

  async disconnect() {
    if (!this.producer || !this.connected) {
      return;
    }

    await this.producer.disconnect();
    this.connected = false;
  }

  private async getProducer() {
    if (!this.producer) {
      this.producer = this.producerFactory();
    }

    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }

    return this.producer;
  }
}

function createDeliveryEventPublisher(): DeliveryEventPublisher {
  return env.KAFKA_ENABLED ? new KafkaDeliveryEventPublisher() : new NoopDeliveryEventPublisher();
}

export const deliveryEventPublisher = createDeliveryEventPublisher();
