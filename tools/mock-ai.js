'use strict';

const http = require('node:http');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const payload = {
      id: 'mock',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              tasks: [
                {
                  title: 'AI 测试：提交合同终稿',
                  due_date: '2026-11-11',
                  due_time: '10:00',
                  priority: 3,
                  notes: '由 mock AI 返回',
                  source_quote: '10月24日前提交合同终稿',
                  confidence: 0.93
                },
                {
                  title: 'AI 测试：确认回款',
                  due_date: '2026-11-12',
                  due_time: null,
                  priority: 2,
                  notes: '',
                  source_quote: '跟进客户回款',
                  confidence: 0.86
                }
              ]
            })
          },
          finish_reason: 'stop'
        }
      ]
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
});

server.listen(8787, '127.0.0.1', () => {
  console.log('mock AI listening on http://127.0.0.1:8787/v1');
});
