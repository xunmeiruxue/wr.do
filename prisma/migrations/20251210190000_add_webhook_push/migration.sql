INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'enable_webhook_push',
    'false',
    'BOOLEAN',
    '是否启用 Webhook 邮件推送'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_url',
    '',
    'STRING',
    'Webhook 推送地址'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_secret',
    '',
    'STRING',
    'Webhook 签名密钥（可选）'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_method',
    'POST',
    'STRING',
    'Webhook HTTP 请求方法'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_headers',
    '{}',
    'STRING',
    'Webhook 自定义请求头（JSON）'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_template',
    '',
    'STRING',
    'Webhook 消息模板（JSON）'
);

INSERT INTO "system_configs"
  (
  "key",
  "value",
  "type",
  "description"
  )
VALUES
  (
    'webhook_target_white_list',
    '',
    'STRING',
    'Webhook 推送目标邮件白名单'
);

-- {
--   "enable_webhook_push": true,
--   "webhook_url": "https://example.com/webhook",
--   "webhook_secret": "your-secret-key",
--   "webhook_method": "POST",
--   "webhook_headers": "{\"Authorization\": \"Bearer token\", \"Content-Type\": \"application/json\"}",
--   "webhook_template": "{\"from\": \"{{from}}\", \"to\": \"{{to}}\", \"subject\": \"{{subject}}\", \"text\": \"{{text}}\"}",
--   "webhook_target_white_list": "admin@example.com,support@example.com"
-- }

-- Webhook 推送说明：
-- - webhook_url 必须是有效的 HTTPS URL
-- - webhook_secret 用于生成 X-Webhook-Signature 请求头（HMAC-SHA256）
-- - webhook_method 支持 POST 或 PUT
-- - webhook_headers 为 JSON 格式的自定义请求头
-- - webhook_template 支持变量替换：{{from}}, {{to}}, {{subject}}, {{text}}, {{date}}
-- - 如果 webhook_target_white_list 为空，则推送所有邮件
-- - 如果 webhook_target_white_list 有值，则只推送白名单中的邮件
