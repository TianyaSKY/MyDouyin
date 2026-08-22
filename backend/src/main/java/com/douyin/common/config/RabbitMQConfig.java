package com.douyin.common.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
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
    public static final String COMMENT_QUEUE_NAME = "event.comment.queue";
    public static final String COMMENT_ROUTING_KEY = "event.comment";
    public static final String DLX_NAME = "event.dlx";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX_NAME);
    }

    @Bean("userEventQueue")
    public Queue userEventQueue() {
        return durableWithDlq(QUEUE_NAME);
    }

    @Bean("videoEmbeddingQueue")
    public Queue videoEmbeddingQueue() {
        return durableWithDlq(VIDEO_EMBEDDING_QUEUE_NAME);
    }

    @Bean("commentQueue")
    public Queue commentQueue() {
        return durableWithDlq(COMMENT_QUEUE_NAME);
    }

    @Bean("userEventDlq")
    public Queue userEventDlq() {
        return new Queue(QUEUE_NAME + ".dlq", true);
    }

    @Bean("videoEmbeddingDlq")
    public Queue videoEmbeddingDlq() {
        return new Queue(VIDEO_EMBEDDING_QUEUE_NAME + ".dlq", true);
    }

    @Bean("commentDlq")
    public Queue commentDlq() {
        return new Queue(COMMENT_QUEUE_NAME + ".dlq", true);
    }

    @Bean
    public Binding userEventDlqBinding(@Qualifier("userEventDlq") Queue queue) {
        return BindingBuilder.bind(queue).to(deadLetterExchange()).with(QUEUE_NAME + ".dlq");
    }

    @Bean
    public Binding videoEmbeddingDlqBinding(@Qualifier("videoEmbeddingDlq") Queue queue) {
        return BindingBuilder.bind(queue).to(deadLetterExchange()).with(VIDEO_EMBEDDING_QUEUE_NAME + ".dlq");
    }

    @Bean
    public Binding commentDlqBinding(@Qualifier("commentDlq") Queue queue) {
        return BindingBuilder.bind(queue).to(deadLetterExchange()).with(COMMENT_QUEUE_NAME + ".dlq");
    }

    private static Queue durableWithDlq(String name) {
        return QueueBuilder.durable(name)
                .deadLetterExchange(DLX_NAME)
                .deadLetterRoutingKey(name + ".dlq")
                .build();
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
    public Binding commentBinding(
            @Qualifier("commentQueue") Queue queue,
            DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(COMMENT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
