import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

import { MSTAY_CORE_ADDRESS } from "../contracts/coreConfig.js";
import { MSTAY_REVIEWS_ADDRESS } from "../contracts/reviewsConfig.js";
import { MSTAY_CORE_ABI } from "../contracts/mstayCoreAbi.js";
import { MSTAY_REVIEWS_ABI } from "../contracts/mstayReviewsAbi.js";

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

function readEvents() {
  ensureEventsFile();
  const raw = fs.readFileSync(eventsPath, "utf8");
  return JSON.parse(raw || "{}");
}

function writeEvents(data) {
  ensureEventsFile();
  fs.writeFileSync(eventsPath, JSON.stringify(data, null, 2), "utf8");
}

function eventAlreadyStored(items, txHash, logIndex) {
  return items.some(
    (item) =>
      item.transactionHash === txHash &&
      Number(item.logIndex) === Number(logIndex),
  );
}

export function startBlockchainListener() {
  try {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8546";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const coreContract = new ethers.Contract(
      MSTAY_CORE_ADDRESS,
      MSTAY_CORE_ABI,
      provider,
    );

    const reviewsContract = new ethers.Contract(
      MSTAY_REVIEWS_ADDRESS,
      MSTAY_REVIEWS_ABI,
      provider,
    );

    console.log("Blockchain listener pokrenut.");
    console.log("Core address:", MSTAY_CORE_ADDRESS);
    console.log("Reviews address:", MSTAY_REVIEWS_ADDRESS);
    console.log("RPC:", rpcUrl);

    coreContract.on(
      "ReservationCreated",
      async (
        id,
        listingId,
        guest,
        checkInDate,
        checkOutDate,
        totalPrice,
        eventPayload,
      ) => {
        try {
          const data = readEvents();

          const transactionHash =
            eventPayload?.log?.transactionHash ||
            eventPayload?.transactionHash ||
            null;

          const logIndex =
            eventPayload?.log?.index ?? eventPayload?.index ?? null;

          const blockNumber =
            eventPayload?.log?.blockNumber ?? eventPayload?.blockNumber ?? null;

          if (
            transactionHash &&
            logIndex !== null &&
            eventAlreadyStored(data.reservations, transactionHash, logIndex)
          ) {
            return;
          }

          data.reservations.push({
            id: id.toString(),
            listingId: listingId.toString(),
            guest,
            checkInDate: checkInDate.toString(),
            checkOutDate: checkOutDate.toString(),
            totalPrice: totalPrice.toString(),
            transactionHash,
            logIndex,
            blockNumber,
            capturedAt: new Date().toISOString(),
          });

          writeEvents(data);

          console.log("Spremljen ReservationCreated:", id.toString());
        } catch (err) {
          console.error("Greška kod ReservationCreated listenera:", err);
        }
      },
    );

    reviewsContract.on(
      "ReviewAdded",
      async (
        id,
        reservationId,
        reviewer,
        reviewedUser,
        rating,
        comment,
        forHost,
        reviewHash,
        eventPayload,
      ) => {
        try {
          const data = readEvents();

          const transactionHash =
            eventPayload?.log?.transactionHash ||
            eventPayload?.transactionHash ||
            null;

          const logIndex =
            eventPayload?.log?.index ?? eventPayload?.index ?? null;

          const blockNumber =
            eventPayload?.log?.blockNumber ?? eventPayload?.blockNumber ?? null;

          if (
            transactionHash &&
            logIndex !== null &&
            eventAlreadyStored(data.reviews, transactionHash, logIndex)
          ) {
            return;
          }

          data.reviews.push({
            id: id.toString(),
            reservationId: reservationId.toString(),
            reviewer,
            reviewedUser,
            rating: Number(rating),
            comment,
            forHost,
            reviewHash,
            transactionHash,
            logIndex,
            blockNumber,
            capturedAt: new Date().toISOString(),
          });

          writeEvents(data);

          console.log("Spremljen ReviewAdded:", id.toString());
        } catch (err) {
          console.error("Greška kod ReviewAdded listenera:", err);
        }
      },
    );

    coreContract.on(
      "PayoutReleased",
      async (id, host, amount, eventPayload) => {
        try {
          const data = readEvents();

          const transactionHash =
            eventPayload?.log?.transactionHash ||
            eventPayload?.transactionHash ||
            null;

          const logIndex =
            eventPayload?.log?.index ?? eventPayload?.index ?? null;

          const blockNumber =
            eventPayload?.log?.blockNumber ?? eventPayload?.blockNumber ?? null;

          if (
            transactionHash &&
            logIndex !== null &&
            eventAlreadyStored(data.payouts, transactionHash, logIndex)
          ) {
            return;
          }

          data.payouts.push({
            id: id.toString(),
            host,
            amount: amount.toString(),
            transactionHash,
            logIndex,
            blockNumber,
            capturedAt: new Date().toISOString(),
          });

          writeEvents(data);

          console.log("Spremljen PayoutReleased:", id.toString());
        } catch (err) {
          console.error("Greška kod PayoutReleased listenera:", err);
        }
      },
    );

    coreContract.on("ReservationCancelledByGuest", async (id, eventPayload) => {
      try {
        const data = readEvents();

        const transactionHash =
          eventPayload?.log?.transactionHash ||
          eventPayload?.transactionHash ||
          null;

        const logIndex =
          eventPayload?.log?.index ?? eventPayload?.index ?? null;

        const blockNumber =
          eventPayload?.log?.blockNumber ?? eventPayload?.blockNumber ?? null;

        if (
          transactionHash &&
          logIndex !== null &&
          eventAlreadyStored(data.cancellations, transactionHash, logIndex)
        ) {
          return;
        }

        data.cancellations.push({
          id: id.toString(),
          type: "guest",
          transactionHash,
          logIndex,
          blockNumber,
          capturedAt: new Date().toISOString(),
        });

        writeEvents(data);

        console.log("Spremljen ReservationCancelledByGuest:", id.toString());
      } catch (err) {
        console.error("Greška kod ReservationCancelledByGuest listenera:", err);
      }
    });

    coreContract.on("ReservationCancelledByHost", async (id, eventPayload) => {
      try {
        const data = readEvents();

        const transactionHash =
          eventPayload?.log?.transactionHash ||
          eventPayload?.transactionHash ||
          null;

        const logIndex =
          eventPayload?.log?.index ?? eventPayload?.index ?? null;

        const blockNumber =
          eventPayload?.log?.blockNumber ?? eventPayload?.blockNumber ?? null;

        if (
          transactionHash &&
          logIndex !== null &&
          eventAlreadyStored(data.cancellations, transactionHash, logIndex)
        ) {
          return;
        }

        data.cancellations.push({
          id: id.toString(),
          type: "host",
          transactionHash,
          logIndex,
          blockNumber,
          capturedAt: new Date().toISOString(),
        });

        writeEvents(data);

        console.log("Spremljen ReservationCancelledByHost:", id.toString());
      } catch (err) {
        console.error("Greška kod ReservationCancelledByHost listenera:", err);
      }
    });
  } catch (err) {
    console.error("Greška kod pokretanja blockchain listenera:", err);
  }
}
