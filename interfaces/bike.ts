export interface IMaintenanceStatus {
  oil: number;
  airFilter: number;
  sparkPlug: number;
  coolant: number;
  chain: number;
  brakes: number;
}

export interface IBike {
  id: string;
  brand: string;
  model: string;
  nickname: string;
  odo: number;
  maintenance?: IMaintenanceStatus;
  lastOilChangeOdo?: number;
  aiCutoutUrl?: string;
}

export interface IMaintenancePart {
  id: keyof IMaintenanceStatus;
  name: string;
  interval: number;
  icon: any;
}
