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
    browser: ["Bot Simple", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("\n📲 ESCANEA ESTE QR DESDE WHATSAPP\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }

    if (connection === "open") {
      console.log("✅ Bot conectado exitosamente.");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.buttonsResponseMessage?.selectedButtonId ||
      "";

    console.log("📩 Mensaje recibido:", text);

    if (text.toLowerCase() === "hola") {
      return sendMainMenu(sock, jid);
    }

    switch (text) {
      case "cliente_final":
        return sock.sendMessage(jid, {
          text: "🧑 *Cliente final*\nMiel, algarrobina y más. Dinos qué buscas."
        });

      case "cliente_mayorista":
        return sock.sendMessage(jid, {
          text:
            "🏪 *Mayorista*\nTrabajamos con negocios. Envíanos tu RUC y destino."
        });

      case "delivery":
        return sock.sendMessage(jid, {
          text:
            "🚚 *Envíos a todo el Perú*\n\nDinos tu distrito o ciudad para cotizar."
        });

      default:
        return sock.sendMessage(jid, {
          text: "Hola 👋\nEscribe *hola* para ver el menú."
        });
    }
  });
}

async function sendMainMenu(sock, jid) {
  await sock.sendMessage(jid, {
    text: "🐝 *Bienvenido a Casa Hacienda*\nElige una opción:",
    buttons: [
      {
        buttonId: "cliente_final",
        buttonText: { displayText: "🧑 Cliente final" },
        type: 1
      },
      {
        buttonId: "cliente_mayorista",
        buttonText: { displayText: "🏪 Mayorista" },
        type: 1
      },
      {
        buttonId: "delivery",
        buttonText: { displayText: "🚚 Envíos" },
        type: 1
      }
    ],
    headerType: 1
  });
}

startBot().catch(console.error);
