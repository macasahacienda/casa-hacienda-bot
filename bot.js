import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import qrcode from "qrcode-terminal";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Casa Hacienda Bot", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("\n📲 Escanea este QR desde WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("Conexión caída. Reconectar:", shouldReconnect);

      if (shouldReconnect) startBot();
    }

    if (connection === "open") {
      console.log("✅ Bot conectado a WhatsApp.");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.buttonsResponseMessage?.selectedButtonId ||
      msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.id ||
      "";

    console.log("📩 Mensaje recibido:", text);

    if (text.toLowerCase() === "hola") {
      return sendMainMenu(sock, jid);
    }

    switch (text) {
      case "cliente_final":
        return sock.sendMessage(jid, {
          text:
            "🧑 *Cliente final*\n\n" +
            "Miel pura 100% natural 🍯\n" +
            "• 1Kg S/46\n" +
            "• 500gr S/28\n" +
            "• 250gr S/19\n\n" +
            "Dime qué presentación deseas."
        });

      case "cliente_mayorista":
        return sock.sendMessage(jid, {
          text:
            "🏪 *Mayorista*\n\n" +
            "Vendemos por mayor a:\n" +
            "• Bodegas\n" +
            "• Tiendas naturistas\n" +
            "• Restaurantes\n" +
            "• Cafeterías\n\n" +
            "Envíame cantidad + destino y te cotizamos."
        });

      case "delivery":
        return sock.sendMessage(jid, {
          text:
            "🚚 *Envíos a todo el Perú*\n\n" +
            "Lima: courier privado 24h\n" +
            "Provincia: Olva / Shalom / Marvisur\n" +
            "Envíos desde S/9\n\n" +
            "Dime tu distrito o ciudad para cotizar."
        });

      default:
        return sock.sendMessage(jid, {
          text: "Hola 👋\nEscribe *hola* para ver el menú."
        });
    }
  });
}

// 🔥 FORMATO DE BOTONES QUE SÍ FUNCIONA EN 2025
async function sendMainMenu(sock, jid) {
  await sock.sendMessage(jid, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: "🐝 *Bienvenido a Casa Hacienda*\n\nElige una opción:"
          },
          footer: {
            text: "Casa Hacienda"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🧑 Cliente Final",
                  id: "cliente_final"
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🏪 Mayorista",
                  id: "cliente_mayorista"
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🚚 Envíos",
                  id: "delivery"
                })
              }
            ]
          }
        }
      }
    }
  });
}

startBot().catch(console.error);
