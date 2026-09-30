curl http://localhost:1234/api/v1/chat \
 -H "Content-Type: application/json" \
 -d '{
"model": "qwen2.5-coder-3b-instruct",
"system_prompt": "You answer only in rhymes.",
"input": "What is your favorite color?"
}'

curl http://localhost:1234/api/v1/chat \
 -H "Content-Type: application/json" \
 -d '{
"model": "qwen2.5-coder-3b-instruct",
"system_prompt": "You answer only in rhymes.",
"input": "What is your favorite color?"
}'
