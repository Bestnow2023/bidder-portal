import {
  addChatMessage,
  addPaymentAsAdmin,
  getPortalData,
  savePaymentMethod,
  saveWorkLog,
  signIn,
  updateUserAsAdmin,
} from "../../../db/portal-store";

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email") || "";
    if (!email) {
      return errorResponse(new Error("Email is required."), 400);
    }

    return Response.json(await getPortalData(email));
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action : "";
    const email = typeof payload.email === "string" ? payload.email : "";

    if (!email) {
      return errorResponse(new Error("Email is required."), 400);
    }

    switch (action) {
      case "signIn":
        return Response.json(await signIn(email, typeof payload.name === "string" ? payload.name : undefined));
      case "updateUser":
        return Response.json(await updateUserAsAdmin(email, payload));
      case "savePaymentMethod":
        return Response.json(await savePaymentMethod(email, payload));
      case "saveWorkLog":
        return Response.json(await saveWorkLog(email, payload));
      case "addPayment":
        return Response.json(await addPaymentAsAdmin(email, payload));
      case "addChatMessage":
        return Response.json(await addChatMessage(email, payload));
      default:
        return errorResponse(new Error("Unknown action."), 400);
    }
  } catch (error) {
    return errorResponse(error, 500);
  }
}
