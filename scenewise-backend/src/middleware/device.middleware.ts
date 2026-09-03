import type { Request, Response, NextFunction } from "express";

// This app has no accounts. Every request that needs to know "who" is
// making it must send an x-device-id header — a random ID the app
// generates once on first launch and stores on the device (see the
// frontend's lib/deviceId.ts). There's no password, no email, nothing to
// look up server-side — it's just a stable anonymous identifier.
//
// This means: no login screen, no signup flow, but also no real security —
// anyone who guesses or copies a device ID can act as that "user". That's an
// acceptable tradeoff for an anonymous review app; it would NOT be
// acceptable if this app ever needs to protect anything sensitive.
declare global {
  namespace Express {
    interface Request {
      deviceId?: string;
    }
  }
}

const requireDeviceId = (req: Request, res: Response, next: NextFunction) => {
  const deviceId = req.header("x-device-id");

  if (!deviceId || typeof deviceId !== "string" || deviceId.length < 8) {
    return res.status(400).json({
      message: "Missing or invalid x-device-id header",
    });
  }

  req.deviceId = deviceId;
  next();
};

export default requireDeviceId;
