/**
 * Service worker FCM servi dynamiquement : la configuration Firebase y est
 * injectée depuis les variables d'environnement au moment de la requête,
 * ce qui évite de figer un projet (dev/preprod/prod) dans un fichier statique.
 *
 * Les messages reçus en arrière-plan portent un payload `notification` :
 * le SDK compat les affiche automatiquement, et `fcmOptions.link` gère le clic.
 */

export const dynamic = "force-static";

export function GET(): Response {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const body = `/* Généré dynamiquement — ne pas éditer. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

// L'affichage des notifications en arrière-plan et le clic (fcmOptions.link)
// sont gérés par le SDK compat.
firebase.messaging();
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      // Autorise le SW à contrôler toute l'origine.
      "Service-Worker-Allowed": "/",
    },
  });
}
