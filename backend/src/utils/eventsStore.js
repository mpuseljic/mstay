import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "../data");
const eventsPath = path.join(dataDir, "blockchainEvents.json");

function ensureEventsFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(eventsPath)) {
    fs.writeFileSync(
      eventsPath,
      JSON.stringify(
        {
          reservations: [],
          reviews: [],
          payouts: [],
          cancellations: [],
        },
        null,
        2,
      ),
      "utf8",
    );
  }
}

export function readEvents() {
  ensureEventsFile();
  const raw = fs.readFileSync(eventsPath, "utf8");
  return JSON.parse(raw || "{}");
}

export function writeEvents(data) {
  ensureEventsFile();
  fs.writeFileSync(eventsPath, JSON.stringify(data, null, 2), "utf8");
}
