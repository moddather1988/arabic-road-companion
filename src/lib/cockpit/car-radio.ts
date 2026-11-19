import { registerPlugin } from "@capacitor/core";

interface CarRadioPlugin {
  open(): Promise<{
    opened: boolean;
    message: string;
  }>;
}

export const CarRadio = registerPlugin<CarRadioPlugin>("CarRadio");
