import { Database } from "bun:sqlite";

interface ChannelConfig {
  type: string;
  inputChannel: string;
  outputChannel: string;
  workflow: (message: string, chatId: number) => Promise<string>;
}

const channelConfigs: { [key: string]: ChannelConfig } = {
  "second": {
    type: "text",
    inputChannel: "-1002306247470",
    outputChannel: "-1002387593811",
    workflow: demoWorkflow,
  },
};

const db = new Database("/path/to/messageQueue.sqlite", { create: true });
await db.query(
  `CREATE TABLE IF NOT EXISTS messageQueue (chatId INTEGER, messageId INTEGER, messageContent TEXT, PRIMARY KEY(chatId, messageId));`,
).run();

async function demoWorkflow(
  messageContent: string,
  chatId: number,
): Promise<string> {
  await Bun.sleep(3000);
  const currentDate = new Date().toLocaleString();
  return `Processed on: ${currentDate}`;
}

async function fetchTelegramUpdates() {
  const telegramApiUrl =
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`;
  let offset = 0;

  while (true) {
    console.log("🔄 Fetching updates...");
    try {
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset, timeout: 10 }),
      });
      const data = await response.json();

      if (data.ok !== false) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.callback_query) {
            const chatId = update.callback_query.message.chat.id;
            const messageId = update.callback_query.message.message_id;
            if (update.callback_query.data === "next") {
              await handleNextCallback(chatId);
            } else if (update.callback_query.data === "acknowledge") {
              await forwardMessageWithTranscript(chatId, messageId);
            }
            continue;
          }

          const channelPost = update.channel_post;
          if (!channelPost) continue;

          const config = Object.values(channelConfigs).find(
            (cfg) => (cfg.inputChannel === channelPost.chat.id.toString() ||
              cfg.inputChannel === channelPost.chat.title),
          );

          if (config && channelPost[config.type]) {
            console.log(
              `📥 Handling ${config.type} message from ${
                channelPost.chat.title || channelPost.chat.id
              }...`,
            );
            await indicateProcessing(
              channelPost.message_id,
              channelPost.chat.id,
              "Processing",
            );
            await queueMessageForProcessing(
              channelPost.message_id,
              channelPost[config.type],
              channelPost.chat.id,
              config.workflow,
            );
          } else {
            console.error(
              `❌ No configuration found for channel ${
                channelPost.chat.title || channelPost.chat.id
              }.`,
            );
          }
        }
      }
    } catch (err) {
      console.error("❌ Error fetching updates from Telegram", err);
    }

    await Bun.sleep(500);
  }
}

async function handleNextCallback(chatId: number) {
  console.log(`🔄 Handling 'next' callback for chat ID: ${chatId}`);
  const rows = db.query(
    "SELECT messageId, messageContent FROM messageQueue WHERE chatId = ?;",
  ).all(chatId);
  if (rows.length > 0) {
    const { messageId, messageContent } = rows[0];
    const config = Object.values(channelConfigs).find((cfg) =>
      cfg.inputChannel === chatId.toString()
    );
    if (config) {
      await executeMessageProcessing(
        chatId,
        messageId,
        messageContent,
        config.workflow,
      );
    }
  }
}

async function indicateProcessing(
  messageId: number,
  chatId: number,
  status: string,
) {
  console.log(
    `🔄 Indicating processing status: ${status} for message ID: ${messageId} in chat ID: ${chatId}`,
  );
  const telegramApiUrl =
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  await fetch(`${telegramApiUrl}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: status, callback_data: "processing" }]],
      },
    }),
  });
}

async function queueMessageForProcessing(
  messageId: number,
  messageContent: string,
  chatId: number,
  workflow: (messageContent: string, chatId: number) => Promise<string>,
) {
  console.log(
    `🔄 Queueing message for processing: ${messageContent} in chat ID: ${chatId}`,
  );
  await db.query(
    "INSERT OR IGNORE INTO messageQueue (chatId, messageId, messageContent) VALUES (?, ?, ?);",
  ).run(chatId, messageId, messageContent);
  const rows = db.query("SELECT messageId FROM messageQueue WHERE chatId = ?;")
    .all(chatId);

  if (rows.length === 1) { // Only process if it's the first in the queue
    await executeMessageProcessing(chatId, messageId, messageContent, workflow);
  }
}

async function executeMessageProcessing(
  chatId: number,
  messageId: number,
  messageContent: string,
  workflow: (messageContent: string, chatId: number) => Promise<string>,
) {
  console.log(
    `🚀 Executing workflow for message: ${messageContent} in chat: ${chatId}`,
  );
  const article = await workflow(messageContent, chatId);
  console.log(`✅ Workflow result: ${article}`);
  await updateMessageWithTranscript(chatId, messageId, article, "Ready");
}

async function updateMessageWithTranscript(
  chatId: number,
  messageId: number,
  article: string,
  status: string,
) {
  const telegramApiUrl =
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  console.log(`✏️ Updating message with transcript in chat: ${chatId}`);
  try {
    const response = await fetch(`${telegramApiUrl}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: `Updated: ${article}`,
        reply_markup: {
          inline_keyboard: [[{ text: status, callback_data: "acknowledge" }]],
        },
      }),
    });
    const result = await response.json();
    if (!result.ok) {
      console.error("❌ Error updating message text", result.description);
    }
  } catch (err) {
    console.error("❌ Error updating message text", err);
  }
}

async function forwardMessageWithTranscript(chatId: number, messageId: number) {
  const row = db.query(
    "SELECT messageContent FROM messageQueue WHERE chatId = ? AND messageId = ?;",
  ).get(chatId, messageId);
  if (!row) {
    console.error(
      `❌ No message found in queue for chat ID: ${chatId}, message ID: ${messageId}`,
    );
    return;
  }

  const messageContent = row.messageContent;
  const config = Object.values(channelConfigs).find((cfg) =>
    cfg.inputChannel === chatId.toString()
  );
  if (!config) {
    console.error(`❌ No output channel configured for chat ${chatId}`);
    return;
  }

  const telegramApiUrl =
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  const message = `Forwarded: ${messageContent}`;
  console.log(
    `📤 Forwarding message to output channel: ${config.outputChannel}`,
  );
  await fetch(`${telegramApiUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.outputChannel,
      text: message,
      reply_markup: {
        inline_keyboard: [[{ text: "Next", callback_data: "next" }]],
      },
    }),
  });

  await deleteMessageAndQueueEntry(chatId, messageId);
}

async function deleteMessageAndQueueEntry(chatId: number, messageId: number) {
  console.log(
    `🗑️ Deleting message and queue entry for chat: ${chatId}, message ID: ${messageId}`,
  );
  await db.query("DELETE FROM messageQueue WHERE chatId = ? AND messageId = ?;")
    .run(chatId, messageId);
}

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw "Missing environment variable for Telegram API";
  }

  await fetchTelegramUpdates();
}

if (import.meta.path === Bun.main) {
  main().catch((err) => console.error("Error in main:", err));
}
