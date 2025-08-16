#!/bin/bash

# Test the new conversation webhook for transcription saving and task creation

echo "Testing ElevenLabs conversation webhook with task creation..."

# Test with a task creation request
curl -X POST http://localhost:5000/api/actions/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test-conversation-001",
    "agent_id": "agent_7401k28d3x9kfdntv7cjrj6t43be",
    "user_id": "test-user",
    "transcript": "Create a task to write a blog post about AI automation",
    "metadata": {
      "sessionId": "s_njlk7hja5y9",
      "source": "voice"
    },
    "messages": [
      {
        "role": "user",
        "content": "Create a task to write a blog post about AI automation"
      }
    ]
  }'

echo -e "\n\n"

# Test with casual conversation (should not create task)
curl -X POST http://localhost:5000/api/actions/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test-conversation-002",
    "agent_id": "agent_7401k28d3x9kfdntv7cjrj6t43be",
    "user_id": "test-user",
    "transcript": "Hello, how are you today?",
    "metadata": {
      "sessionId": "s_njlk7hja5y9",
      "source": "voice"
    },
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you today?"
      }
    ]
  }'

echo -e "\n\nTest completed. Check server logs for processing results."