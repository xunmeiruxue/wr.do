import { getConfiguredEmailDomains } from "@/lib/dto/domains";
import { OriginalEmail, saveForwardEmail } from "@/lib/dto/email";
import { getMultipleConfigs } from "@/lib/dto/system-config";
import { brevoSendEmail } from "@/lib/email/brevo";

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as OriginalEmail;
    if (!data) {
      return Response.json("No email data received", { status: 400 });
    }

    const configs = await getMultipleConfigs([
      "enable_email_catch_all",
      "catch_all_emails",
      "enable_tg_email_push",
      "tg_email_bot_token",
      "tg_email_chat_id",
      "tg_email_template",
      "tg_email_target_white_list",
      "enable_email_forward",
      "email_forward_targets",
      "email_forward_white_list",
      "enable_webhook_push",
      "webhook_url",
      "webhook_secret",
      "webhook_method",
      "webhook_headers",
      "webhook_template",
      "webhook_target_white_list",
    ]);

    // 处理邮件转发和保存
    await handleEmailForwarding(data, configs);

    // Telegram
    if (configs.enable_tg_email_push) {
      const shouldPush = shouldPushToTelegram(
        data,
        configs.tg_email_target_white_list,
      );
      if (shouldPush) {
        await sendToTelegram(data, configs);
      }
    }

    // Webhook
    if (configs.enable_webhook_push) {
      const shouldPush = shouldPushToWebhook(
        data,
        configs.webhook_target_white_list,
      );
      if (shouldPush) {
        await sendToWebhook(data, configs);
      }
    }

    return Response.json({ status: 200 });
  } catch (error) {
    console.log(error);
    return Response.json({ status: 500 });
  }
}

async function handleEmailForwarding(data: OriginalEmail, configs: any) {
  const actions = determineEmailActions(data, configs);

  const promises: Promise<void>[] = [];

  if (actions.includes("CATCH_ALL")) {
    promises.push(handleCatchAllEmail(data, configs));
  }

  if (actions.includes("EXTERNAL_FORWARD")) {
    promises.push(handleExternalForward(data, configs));
  }

  if (actions.includes("NORMAL_SAVE")) {
    promises.push(handleNormalEmail(data));
  }

  // 并行执行所有操作
  const results = await Promise.allSettled(promises);

  // 检查是否有失败的操作
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error("Some email operations failed:", failures);
    const firstFailure = failures[0] as PromiseRejectedResult;
    throw new Error(`Email operation failed: ${firstFailure.reason}`);
  }
}

function determineEmailActions(data: OriginalEmail, configs: any): string[] {
  const actions: string[] = [];

  // 检查转发白名单
  const isInForwardWhiteList = checkForwardWhiteList(
    data.to,
    configs.email_forward_white_list,
  );

  // 检查是否配置了任何转发功能并且在白名单中
  const hasCatchAllForward =
    configs.enable_email_catch_all && isInForwardWhiteList;
  const hasExternalForward =
    configs.enable_email_forward && isInForwardWhiteList;
  const hasAnyForward = hasCatchAllForward || hasExternalForward;

  if (hasCatchAllForward) {
    actions.push("CATCH_ALL");
  }

  if (hasExternalForward) {
    actions.push("EXTERNAL_FORWARD");
  }

  // 只有在没有配置任何转发时，才进行正常保存原始邮件
  if (!hasAnyForward) {
    actions.push("NORMAL_SAVE");
  }

  return actions;
}

// 新增：检查邮箱是否在转发白名单中
function checkForwardWhiteList(
  toEmail: string,
  whiteListString: string,
): boolean {
  // 如果没有配置白名单，则允许所有邮箱（保持向后兼容）
  if (!whiteListString || whiteListString.trim() === "") {
    return true;
  }

  const whiteList = parseAndValidateEmails(whiteListString);
  return whiteList.includes(toEmail);
}

async function handleCatchAllEmail(data: OriginalEmail, configs: any) {
  const validEmails = parseAndValidateEmails(configs.catch_all_emails);

  if (validEmails.length === 0) {
    throw new Error("No valid catch-all emails configured");
  }

  // 转发到内部邮箱（保存转发后的邮件）
  const forwardPromises = validEmails.map((email) =>
    saveForwardEmail({ ...data, to: email }),
  );

  await Promise.all(forwardPromises);
}

async function handleExternalForward(data: OriginalEmail, configs: any) {
  const validEmails = parseAndValidateEmails(configs.email_forward_targets);

  if (validEmails.length === 0) {
    throw new Error("No valid forward emails configured");
  }

  const senders = await getConfiguredEmailDomains();
  if (senders.length === 0) {
    throw new Error("No configured resend domains");
  }

  const options = {
    from: `Forwarding@${senders[0].domain_name}`,
    to: validEmails,
    subject: data.subject ?? "No subject",
    html: `${data.html ?? data.text} <br><hr><p style="font-size: '12px'; color: '#888'; font-family: 'monospace';text-align: 'center'">This email was forwarded from ${data.to}. Powered by <a href="https://wr.do">WR.DO</a>.</p>`,
  };

  await brevoSendEmail(options);
}

async function handleNormalEmail(data: OriginalEmail) {
  await saveForwardEmail(data);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function parseAndValidateEmails(emailsString: string): string[] {
  if (!emailsString || typeof emailsString !== "string") {
    return [];
  }

  const emails = emailsString
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  const validEmails = emails.filter((email) => isValidEmail(email));

  if (validEmails.length !== emails.length) {
    console.warn(
      "Some invalid email addresses found:",
      emails.filter((email) => !isValidEmail(email)),
    );
  }

  return validEmails;
}

/*  Pusher   */
function shouldPushToTelegram(
  email: OriginalEmail,
  whiteList: string,
): boolean {
  if (!whiteList || whiteList.trim() === "") {
    return true;
  }

  const whiteListArray = whiteList
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  return whiteListArray.includes(email.to);
}

async function sendToTelegram(email: OriginalEmail, configs: any) {
  const { tg_email_bot_token, tg_email_chat_id, tg_email_template } = configs;

  if (!tg_email_bot_token || !tg_email_chat_id) {
    console.error("Telegram bot token or chat ID not configured");
    return;
  }

  // 解析多个 chat ID（支持逗号分隔）
  const chatIds = tg_email_chat_id
    .split(",")
    .map((id: string) => id.trim())
    .filter((id: string) => id.length > 0);

  if (chatIds.length === 0) {
    console.error("No valid chat IDs found");
    return;
  }

  try {
    const message = formatEmailForTelegram(email, tg_email_template);

    const sendPromises = chatIds.map(async (chatId: string) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${tg_email_bot_token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "Markdown",
              disable_web_page_preview: true,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          console.error(
            `Failed to send message to Telegram chat ${chatId}:`,
            error,
          );
          return { chatId, success: false, error };
        } else {
          console.log(`Email successfully sent to Telegram chat ${chatId}`);
          return { chatId, success: true };
        }
      } catch (error) {
        console.error(`Error sending to Telegram chat ${chatId}:`, error);
        return { chatId, success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    console.log(
      `Telegram push completed: ${successCount}/${totalCount} successful`,
    );
  } catch (error) {
    console.error("Error in sendToTelegram:", error);
  }
}

// 格式化邮件内容为 Telegram 消息（Markdown 格式）
function formatEmailForTelegram(
  email: OriginalEmail,
  template?: string,
): string {
  const fromInfo = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;

  if (template) {
    return template
      .replace("{{from}}", fromInfo)
      .replace("{{to}}", email.to)
      .replace("{{subject}}", email.subject || "No Subject")
      .replace("{{text}}", email.html || email.text || "No Content")
      .replace("{{date}}", new Date(email.date || "").toLocaleString() || "--");
  }

  const subject = email.subject || "No Subject";
  const content =
    email.text || email.html?.replace(/<[^>]*>/g, "") || "No Content";

  const date = new Date(email.date || "").toLocaleString() || "--";

  // 限制内容长度
  const maxContentLength = 3800; // Maximum Telegram message length is 4096
  const truncatedContent =
    content.length > maxContentLength
      ? content.substring(0, maxContentLength) + "..."
      : content;

  let message = `📮 *New Email*\n\n`;
  message += `*From:* \`${fromInfo}\`\n`;
  message += `*To:* \`${email.to}\`\n`;
  message += `*Subject:* ${subject}\n`;
  message += `*Date:* ${new Date(date).toLocaleString()}\n`;
  message += `*Content:* \n${truncatedContent}`;

  return message;
}

// Webhook 推送白名单检查
function shouldPushToWebhook(
  email: OriginalEmail,
  whiteList: string,
): boolean {
  if (!whiteList || whiteList.trim() === "") {
    return true;
  }

  const whiteListArray = whiteList
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  return whiteListArray.includes(email.to);
}

// 发送到 Webhook
async function sendToWebhook(email: OriginalEmail, configs: any) {
  const {
    webhook_url,
    webhook_secret,
    webhook_method,
    webhook_headers,
    webhook_template,
  } = configs;

  if (!webhook_url) {
    console.error("Webhook URL not configured");
    return;
  }

  try {
    const payload = formatEmailForWebhook(email, webhook_template);

    // 解析自定义请求头
    let customHeaders: Record<string, string> = {};
    try {
      if (webhook_headers && webhook_headers.trim() !== "") {
        customHeaders = JSON.parse(webhook_headers);
      }
    } catch (error) {
      console.error("Failed to parse webhook_headers:", error);
    }

    // 构建请求头
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // 如果配置了密钥，添加签名
    if (webhook_secret && webhook_secret.trim() !== "") {
      const { createHmac } = await import("crypto");
      const hmac = createHmac("sha256", webhook_secret);
      hmac.update(JSON.stringify(payload));
      const signature = hmac.digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    const method = (webhook_method || "POST").toUpperCase();

    const response = await fetch(webhook_url, {
      method: method,
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to send webhook: ${response.status} ${response.statusText}`,
        errorText,
      );
    } else {
      console.log(`Email successfully sent to webhook: ${webhook_url}`);
    }
  } catch (error) {
    console.error("Error in sendToWebhook:", error);
  }
}

// 格式化邮件内容为 Webhook payload（JSON 格式）
function formatEmailForWebhook(
  email: OriginalEmail,
  template?: string,
): any {
  const fromInfo = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;

  const defaultPayload = {
    from: email.from,
    fromName: email.fromName || "",
    fromInfo: fromInfo,
    to: email.to,
    subject: email.subject || "No Subject",
    text: email.text || "",
    html: email.html || "",
    date: email.date || "",
    messageId: email.messageId || "",
    replyTo: email.replyTo || "",
    cc: email.cc || [],
    headers: email.headers || [],
    attachments: email.attachments || [],
  };

  // 如果有自定义模板，尝试解析并合并
  if (template && template.trim() !== "") {
    try {
      const customTemplate = JSON.parse(template);
      // 如果模板是字符串类型，进行变量替换
      if (typeof customTemplate === "string") {
        const replaced = customTemplate
          .replace("{{from}}", email.from)
          .replace("{{fromName}}", email.fromName || "")
          .replace("{{fromInfo}}", fromInfo)
          .replace("{{to}}", email.to)
          .replace("{{subject}}", email.subject || "No Subject")
          .replace("{{text}}", email.text || "")
          .replace("{{html}}", email.html || "")
          .replace("{{date}}", email.date || "");
        return { message: replaced, ...defaultPayload };
      }
      // 如果模板是对象，与默认 payload 合并
      return { ...defaultPayload, ...customTemplate };
    } catch (error) {
      console.error("Failed to parse webhook_template:", error);
    }
  }

  return defaultPayload;
}
