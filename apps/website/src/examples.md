```bash
# openai chat competions:
curl -X POST \ \
  "http://127.0.0.1:1234/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"model":"qwen2.5-coder-3b-instruct","messages":[{"role":"user","content":"what are your capabilities?"}],"stream":true,"temperature":0.7,"max_tokens":2048}'



# openai responses :
curl -X POST \ \
  "http://127.0.0.1:1234/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"model":"qwen2.5-coder-3b-instruct","input":[{"role":"user","content":"what are your capabilities?"}],"stream":true,"temperature":0.7,"max_tokens":2048}'


# anthropic:
   curl -X POST \ \
  "http://127.0.0.1:1234/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"model":"qwen2.5-coder-3b-instruct","messages":[{"role":"user","content":"what are your capabilities?"}],"stream":true,"temperature":0.7,"max_tokens":2048}'
```
