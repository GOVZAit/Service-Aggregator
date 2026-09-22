import { z } from "zod";

export type OrderTrackingStatus = "en_route" | "arrived" | "stopped";

export const orderTrackingLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(150).nullable().optional(),
}).strict();

export interface OrderTrackingView {
  orderId: number;
  status: OrderTrackingStatus;
  lat?: number;
  lng?: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  startedAt: string;
  updatedAt: string;
  stoppedAt?: string;
}

export interface ActiveOrderTrackingView {
  orderId: number;
  status: "en_route";
}
