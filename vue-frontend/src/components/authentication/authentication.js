import { MODE_ENV } from "@/components/global_vars";

export function getCurrentUser(req) {
  if (MODE_ENV === "development") {
    // mocked token
    return "demo.user@example.com";
  } else {
    // In der Produktionsumgebung den echten Benutzer aus den IAP-Headern extrahieren
    const userEmail = req.headers["X-Goog-Authenticated-User-Email"];
    // const userId = req.headers['X-Goog-Authenticated-User-ID'];
    return `${userEmail}`;
  }
}
