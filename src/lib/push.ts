"use client";

/**
 * Push web (FCM) côté admin.
 *
 * `enablePush(ids)` : demande la permission, enregistre le service worker,
 * récupère le token FCM et l'enregistre dans `fcmTokens/{token}` avec les
 * uid de l'admin — la Cloud Function
 * `sendPushOnNotification` cible ces tokens à chaque notification créée.
 *
 * `refreshPushToken(ids)` : à appeler quand la permission est déjà accordée
 * (rafraîchit le token et sa date sans re-prompter).
 */

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";

import { app } from "@/firebase/app";
import { db } from "@/firebase/firestore";

const SW_URL = "/firebase-messaging-sw.js";
const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type PushStatus = "unsupported" | "no-vapid" | "denied" | "default" | "granted";

/** Support du push par ce navigateur (et configuration présente). */
export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!(await isSupported().catch(() => false))) return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (!VAPID_KEY) return "no-vapid";
  return Notification.permission as PushStatus;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported().catch(() => false))) return null;
  return getMessaging(app);
}

async function registerToken(ids: string[], audience: "member" | "admin"): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging || !VAPID_KEY) return null;

  const registration = await navigator.serviceWorker.register(SW_URL);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return null;

  await setDoc(
    doc(db, "fcmTokens", token),
    {
      audience,
      memberIds: ids,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return token;
}

/** Demande la permission puis enregistre le token. Renvoie le statut final. */
export async function enablePush(ids: string[]): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status === "unsupported" || status === "no-vapid" || status === "denied") return status;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushStatus;

  await registerToken(ids, "admin");
  return "granted";
}

/** Rafraîchit le token si la permission est déjà accordée (silencieux). */
export async function refreshPushToken(ids: string[]): Promise<void> {
  const status = await getPushStatus();
  if (status !== "granted") return;
  try {
    await registerToken(ids, "admin");
  } catch (err) {
    console.error("[push] rafraîchissement du token impossible:", err);
  }
}

/** Écoute les messages reçus quand l'app est au premier plan. */
export async function listenForegroundMessages(
  onNotification: (payload: { title: string; body: string }) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    onNotification({
      title: payload.notification?.title ?? "KARA",
      body: payload.notification?.body ?? "",
    });
  });
}
