package com.douyin.common.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "event.exchange";
    public static final String QUEUE_NAME = "event.user_behavior.queue";
    public static final String ROUTING_KEY = "event.user_behavior";
    public static final String VIDEO_EMBEDDING_QUEUE_NAME = "event.video_embedding.queue";
    public static final String VIDEO_EMBEDDING_ROUTING_KEY = "event.video_embedding";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean("userEventQueue")
    public Queue userEventQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Bean("videoEmbeddingQueue")
    public Queue videoEmbeddingQueue() {
        return new Queue(VIDEO_EMBEDDING_QUEUE_NAME, true);
    }

    @Bean
    public Binding userEventBinding(
            @Qualifier("userEventQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(ROUTING_KEY);
    }

    @Bean
    public Binding videoEmbeddingBinding(
            @Qualifier("videoEmbeddingQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(VIDEO_EMBEDDING_ROUTING_KEY);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
